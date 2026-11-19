import type { QueryClient } from '@tanstack/react-query'
import { setUnauthorizedHandler, setForbiddenHandler, toApiError, limpiarContextoAgencia } from '@/shared/api'
import { getMe, logout } from '@/features/auth/api/auth.api'
import { AUTH_ENDPOINTS, esMotivoCierre, type MeResponse, type MotivoCierre } from '@/features/auth/api/auth.contract'
import { iniciarControlInactividad, permiteActualizarAccesos } from '@/features/auth/inactividad'
import { useEstadoAccesos } from '@/features/auth/store/estado-accesos.store'
import { escuchar, publicar } from '@/features/auth/lib/canal-sesion'
import { guardarCierrePendiente } from '@/features/auth/lib/cierre-pendiente'
import { sanitizeReturnTo } from '@/features/auth/lib/return-to'
import { useAuthStore } from '@/features/auth/store/auth.store'

let sessionCache: Pick<QueryClient, 'clear'> | null = null
let pending: { user: MeResponse; promise: Promise<boolean> } | null = null
let ultimaRevisionAccesos = 0
let ultimoIntentoAccesos = 0
const REVISAR_ACCESOS_TRAS_MS = 30_000

function compareAccessValues(a: string, b: string) {
  if (a === b) return 0
  return a < b ? -1 : 1
}

function accessKey(user: MeResponse) {
  const roles = [...new Set(user.roles.map((role) => role.trim().toUpperCase()))].sort(compareAccessValues)
  const permissions = [...new Set(user.permisos)].sort(compareAccessValues)
  return JSON.stringify([
    user.idUsuario,
    user.idOrganizacion,
    user.idAgencia,
    roles,
    permissions,
    user.accesosSecciones?.version ?? null,
    user.autorizacion?.version ?? null,
  ])
}

/**
 * Olvida al usuario y vacía la caché de consultas (datos de clientes, cuentas o tarjetas no deben
 * seguir en memoria ni mostrarse a quien entre después). Avisa a las demás pestañas para que
 * todas vayan al login a la vez; RequireAuth guarda la ruta actual como `return_to`.
 */
function cerrarSesionLocal(motivo: MotivoCierre | null) {
  const teniaSesion = useAuthStore.getState().user !== null
  limpiarContextoAgencia()
  useAuthStore.getState().clearSession(motivo)
  sessionCache?.clear()
  if (teniaSesion) publicar({ tipo: 'cerrada', motivo })
}

/** Relee /me tras una acción del usuario (403, cambio de rol propio). Nunca con temporizador. */
export function refreshSession(): Promise<boolean> {
  const previous = useAuthStore.getState().user
  if (!previous) return Promise.resolve(false)
  if (pending?.user === previous) return pending.promise

  const promise = (async () => {
    try {
      const current = await getMe()
      // Un logout o una sesión nueva prevalecen sobre una respuesta antigua.
      if (useAuthStore.getState().user !== previous) return false
      if (accessKey(previous) !== accessKey(current)) sessionCache?.clear()
      useAuthStore.getState().setSession(current)
      ultimaRevisionAccesos = Date.now()
      useEstadoAccesos.setState({ fallo: false })
      return true
    } catch (error) {
      // Un 401 ya lo atendió el interceptor (con su motivo)
      if (useAuthStore.getState().user !== previous) return false
      if (toApiError(error).status === 403) cerrarSesionLocal(null)
      if (useAuthStore.getState().status === 'authenticated') useEstadoAccesos.setState({ fallo: true })
      // Una caída temporal no significa que la sesión haya terminado.
      return false
    }
  })()
  pending = { user: previous, promise }
  void promise.finally(() => {
    if (pending?.promise === promise) pending = null
  })
  return promise
}

/** Solo por navegación/foco del usuario. Sin sondeos que prolonguen la inactividad. */
export async function actualizarAccesosPorActividad() {
  const ahora = Date.now()
  if (useAuthStore.getState().status !== 'authenticated' || document.visibilityState === 'hidden'
      || !permiteActualizarAccesos() || ahora - Math.max(ultimaRevisionAccesos, ultimoIntentoAccesos) < REVISAR_ACCESOS_TRAS_MS) return
  ultimoIntentoAccesos = ahora
  await refreshSession()
}

/**
 * Cierre por inactividad detectado en el navegador. Como el front cierra antes que WorkOS, la
 * sesión sigue viva allí: hay que navegar a su logout URL (POST /logout solo borra la cookie) o el
 * siguiente "Iniciar sesión" entraría sin pedir credenciales. El aviso y la ruta actual se guardan
 * para mostrarlos al volver a /login.
 */
async function expirarPorInactividad() {
  guardarCierrePendiente({
    motivo: 'SESION_INACTIVA',
    returnTo: sanitizeReturnTo(`${window.location.pathname}${window.location.search}`),
  })
  // Deja de mostrar datos ya, sin esperar al backend
  cerrarSesionLocal('SESION_INACTIVA')
  let logoutUrl: string | null = null
  try {
    ;({ logoutUrl } = await logout())
  } catch {
    // Sin respuesta: la cookie queda y WorkOS cierra la sesión por inactividad en minutos
  }
  window.location.href = logoutUrl ?? '/login'
}

/**
 * Sincroniza la sesión sin peticiones en segundo plano:
 * - con sesión, vigila la inactividad (aviso al minuto 13 y cierre al 15);
 * - escucha a las demás pestañas: un cierre en una cierra todas, y un login en una hace entrar a
 *   las que estaban en /login (sin volver a WorkOS, que reemplazaría la sesión recién creada).
 */
export function startSessionSync() {
  let detenerInactividad: (() => void) | null = null
  const alCambiarEstado = (status: string) => {
    if (status === 'authenticated' && !detenerInactividad) {
      detenerInactividad = iniciarControlInactividad(() => void expirarPorInactividad())
    } else if (status !== 'authenticated' && detenerInactividad) {
      detenerInactividad()
      detenerInactividad = null
    }
  }
  alCambiarEstado(useAuthStore.getState().status)
  const desuscribir = useAuthStore.subscribe((state) => alCambiarEstado(state.status))

  const dejarDeEscuchar = escuchar((mensaje) => {
    const { status } = useAuthStore.getState()
    if (mensaje.tipo === 'cerrada' && status === 'authenticated') {
      limpiarContextoAgencia()
      useAuthStore.getState().clearSession(mensaje.motivo)
      sessionCache?.clear()
    }
    if (mensaje.tipo === 'iniciada' && status === 'anonymous') void restoreSession()
    if (mensaje.tipo === 'accesos-cambiados' && status === 'authenticated' && permiteActualizarAccesos()) void refreshSession()
  })

  const alVolver = () => { void actualizarAccesosPorActividad() }
  window.addEventListener('focus', alVolver)
  document.addEventListener('visibilitychange', alVolver)

  return () => {
    desuscribir()
    dejarDeEscuchar()
    detenerInactividad?.()
    detenerInactividad = null
    window.removeEventListener('focus', alVolver)
    document.removeEventListener('visibilitychange', alVolver)
  }
}

/**
 * Al cargar la app pregunta al backend quién es el usuario.
 *
 * Así es como la SPA "se entera" de que el login terminó: el callback de FastAPI acaba con un 302
 * hacia la SPA, lo que es una carga completa de la página, y esta función se ejecuta en cada carga.
 * Si la cookie es válida → 200 y queda autenticado; si no → 401 y queda anónimo (con el motivo
 * que puso el interceptor, p. ej. al recargar tras 15 min de inactividad).
 */
export async function restoreSession() {
  try {
    useAuthStore.getState().setSession(await getMe())
    ultimaRevisionAccesos = Date.now()
    useEstadoAccesos.setState({ fallo: false })
    publicar({ tipo: 'iniciada' })
  } catch {
    // Error de red/servidor: se trata como anónimo y el guard lleva a /login. Un 401 ya lo atendió
    // el interceptor y no se pisa su motivo.
    if (useAuthStore.getState().status === 'restoring') useAuthStore.getState().clearSession()
  }
}

/**
 * Cierra la sesión en el backend (borra la cookie) y en WorkOS (navegando a su logout URL,
 * que luego devuelve al usuario al "Sign-out URI" configurado). Es lo que libera la sesión para
 * entrar desde otro dispositivo.
 */
export async function signOut() {
  let logoutUrl: string | null = null
  try {
    ;({ logoutUrl } = await logout())
  } catch {
    // Aunque el backend falle, se limpia el estado local
  }
  cerrarSesionLocal(null)
  window.location.href = logoutUrl ?? '/login'
}

/**
 * Conecta el cliente HTTP de `shared/api` con esta feature: un 401 de cualquier endpoint significa
 * que la sesión terminó (la cookie ya viene borrada, no hace falta llamar a /logout). Su `code`
 * dice por qué, y /login lo explica.
 */
export function registerAuthHandlers(queryClient: Pick<QueryClient, 'clear'>) {
  sessionCache = queryClient
  setUnauthorizedHandler((error) => {
    const motivo = esMotivoCierre(error.code) ? error.code : null
    const { status, motivoCierre } = useAuthStore.getState()
    if (status === 'anonymous') {
      // Peticiones que siguieron en vuelo: sin cookie responden NO_AUTENTICADO y no deben
      // borrar el motivo que trajo el primer 401.
      useAuthStore.getState().clearSession(motivoCierre ?? motivo)
      queryClient.clear()
      return
    }
    cerrarSesionLocal(motivo)
  })
  setForbiddenHandler(async (url) => {
    // /me también puede rechazar un usuario desactivado: no volver a llamarse a sí mismo.
    if (url !== AUTH_ENDPOINTS.me) await refreshSession()
  })
}
