import { create } from 'zustand'

import { refresh } from '@/features/auth/api/auth.api'
import { DURACION_ACCESS_TOKEN_MS, INACTIVIDAD_SESION_MS } from '@/features/auth/api/auth.contract'
import { escuchar, publicar } from '@/features/auth/lib/canal-sesion'

/*
 * Control de inactividad (la autoridad es WorkOS: 15 min sin renovar la sesión).
 *
 * Nada de peticiones en segundo plano: contarían como actividad y la sesión nunca se cerraría.
 * La sesión solo se renueva (POST /auth/refresh) cuando el usuario interactúa con la página y la
 * última renovación conocida tiene más de RENOVAR_TRAS_MS. Así el reloj local sigue al del servidor:
 * se avisa al minuto 13 desde la última renovación y se cierra al 15, nunca después que WorkOS.
 */

/** Aviso con cuenta regresiva antes del cierre (minuto 13) */
export const AVISO_ANTES_MS = 2 * 60_000
/** Con actividad, renovar si la última renovación tiene más de esto */
const RENOVAR_TRAS_MS = 2 * 60_000
/** Tras un fallo de red no reintentar en cada movimiento del ratón */
const ESPERA_REINTENTO_MS = 30_000
const REVISAR_CADA_MS = 1_000
/** Sin interactuar más que esto, la pestaña deja de consultar en segundo plano (DSO-001) */
export const ACTIVIDAD_RECIENTE_MS = 2 * 60_000

const EVENTOS_ACTIVIDAD = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'] as const

interface InactividadState {
  /** Momento (ms) en que se cerrará la sesión; null si el aviso no está visible */
  venceEn: number | null
  renovando: boolean
  /** La última renovación pedida desde el aviso falló (sin red, servidor caído) */
  fallo: boolean
  /** El usuario interactuó con esta pestaña hace menos de ACTIVIDAD_RECIENTE_MS */
  activo: boolean
}

export const useInactividad = create<InactividadState>()(() => ({ venceEn: null, renovando: false, fallo: false, activo: false }))

/**
 * Las consultas periódicas (p. ej. la campana de aprobaciones) sólo corren con actividad reciente:
 * cada petición renueva la sesión en el servidor y, sin esto, una pestaña desatendida no caducaría nunca.
 */
export const useActividadReciente = () => useInactividad(s => s.activo)

let ultimaRenovacion = 0
let ultimoIntento = 0
let ultimaActividad = 0
let enCurso: Promise<void> | null = null

/** Una actualización visual no debe revivir una sesión vencida ni cerrar su aviso. */
export function permiteActualizarAccesos() {
  return ultimaRenovacion > 0 && Date.now() < ultimaRenovacion + INACTIVIDAD_SESION_MS
    && useInactividad.getState().venceEn === null
}

function marcarRenovada(en: number) {
  if (en <= ultimaRenovacion) return
  ultimaRenovacion = en
  useInactividad.setState({ venceEn: null, fallo: false })
}

/** Una sola renovación a la vez. Un 401 lo atiende el interceptor (lleva al login con el motivo). */
async function renovar(): Promise<boolean> {
  if (!enCurso) {
    // Se toma el inicio: el servidor renovó entre el envío y la respuesta, nunca antes
    const inicio = Date.now()
    ultimoIntento = inicio
    enCurso = refresh()
      .then(() => {
        marcarRenovada(inicio)
        publicar({ tipo: 'renovada', en: inicio })
      })
      .finally(() => {
        enCurso = null
      })
  }
  try {
    await enCurso
    return true
  } catch {
    return false
  }
}

/** Botón «Seguir conectado» del aviso */
export async function seguirConectado() {
  useInactividad.setState({ renovando: true, fallo: false })
  const ok = await renovar()
  useInactividad.setState({ renovando: false, fallo: !ok })
}

/**
 * Empieza a vigilar la inactividad de una sesión ya autenticada. `alExpirar` se llama una vez,
 * cuando pasan INACTIVIDAD_SESION_MS desde la última renovación conocida. Devuelve cómo detenerlo.
 */
export function iniciarControlInactividad(alExpirar: () => void): () => void {
  // No se sabe cuándo renovó el servidor por última vez (/me renueva solo si el access token
  // venció): se supone lo peor y la primera interacción renueva.
  ultimaRenovacion = Date.now() - DURACION_ACCESS_TOKEN_MS
  ultimoIntento = 0
  // Acaba de entrar o de recargar: cuenta como actividad
  ultimaActividad = Date.now()
  useInactividad.setState({ venceEn: null, renovando: false, fallo: false, activo: true })
  let expirada = false

  const revisar = () => {
    if (expirada) return
    const venceEn = ultimaRenovacion + INACTIVIDAD_SESION_MS
    const ahora = Date.now()
    if (useInactividad.getState().activo && ahora - ultimaActividad >= ACTIVIDAD_RECIENTE_MS) useInactividad.setState({ activo: false })
    if (ahora >= venceEn) {
      expirada = true
      useInactividad.setState({ venceEn: null })
      alExpirar()
    } else if (ahora >= venceEn - AVISO_ANTES_MS && useInactividad.getState().venceEn !== venceEn) {
      useInactividad.setState({ venceEn })
    }
  }

  const alInteractuar = () => {
    // Con el aviso visible hay que elegir un botón: mover el ratón no basta
    if (useInactividad.getState().venceEn !== null) return
    const ahora = Date.now()
    ultimaActividad = ahora
    if (!useInactividad.getState().activo) useInactividad.setState({ activo: true })
    if (ahora - ultimaRenovacion < RENOVAR_TRAS_MS || ahora - ultimoIntento < ESPERA_REINTENTO_MS) return
    void renovar()
  }

  const opciones = { capture: true, passive: true } as const
  for (const evento of EVENTOS_ACTIVIDAD) document.addEventListener(evento, alInteractuar, opciones)
  // Los temporizadores se frenan en pestañas ocultas o con el equipo suspendido: al volver se revisa ya
  document.addEventListener('visibilitychange', revisar)
  window.addEventListener('focus', revisar)
  const temporizador = setInterval(revisar, REVISAR_CADA_MS)

  const dejarDeEscuchar = escuchar((mensaje) => {
    if (mensaje.tipo === 'renovada') marcarRenovada(mensaje.en)
    if (mensaje.tipo === 'consulta') publicar({ tipo: 'renovada', en: ultimaRenovacion })
  })
  publicar({ tipo: 'consulta' })

  return () => {
    for (const evento of EVENTOS_ACTIVIDAD) document.removeEventListener(evento, alInteractuar, opciones)
    document.removeEventListener('visibilitychange', revisar)
    window.removeEventListener('focus', revisar)
    clearInterval(temporizador)
    dejarDeEscuchar()
    useInactividad.setState({ venceEn: null, renovando: false, fallo: false, activo: false })
  }
}
