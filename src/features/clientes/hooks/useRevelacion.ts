import { useEffect, useReducer } from 'react'

import { usePuedeFuncion, useAuthStore, usePermisos } from '@/features/auth'
import { errorRevelacion, pedirDesafioRevelacion, revelarDatos, type CampoRevelable } from '@/features/clientes/api/revelacion'
import { accesoDatosSensibles } from '@/features/clientes/lib/gestion-clientes'
import { OCULTAR_TRAS_MS, REVELACION_INICIAL, revelacionReducer } from '@/features/clientes/lib/revelacion'

/**
 * E5-05 · Pide el desafío MFA, envía el código y guarda el valor completo SOLO en el estado del
 * componente (sin TanStack Query ni almacenamiento del navegador). Se oculta solo a los 60 s.
 */
export function useRevelacion(idCliente: number, campos: readonly CampoRevelable[]) {
  const [estado, despachar] = useReducer(revelacionReducer, REVELACION_INICIAL)

  useEffect(() => {
    if (estado.fase !== 'visible') return
    const temporizador = setTimeout(() => despachar({ tipo: 'ocultar' }), OCULTAR_TRAS_MS)
    return () => clearTimeout(temporizador)
  }, [estado.fase])

  async function abrir() {
    despachar({ tipo: 'abrir' })
    try {
      const { idDesafio } = await pedirDesafioRevelacion(idCliente)
      despachar({ tipo: 'desafio', idDesafio })
    } catch (error) {
      despachar({ tipo: 'fallo', ...errorRevelacion(error) })
    }
  }

  async function enviar() {
    const siguiente = revelacionReducer(estado, { tipo: 'verificar' })
    if (siguiente === estado || !estado.idDesafio) return
    despachar({ tipo: 'verificar' })
    try {
      const datos = await revelarDatos(idCliente, { campos: [...campos], idDesafio: estado.idDesafio, codigo: estado.codigo })
      despachar({ tipo: 'revelado', datos })
    } catch (error) {
      despachar({ tipo: 'fallo', ...errorRevelacion(error) })
    }
  }

  return {
    estado,
    abrir: () => void abrir(),
    enviar: () => void enviar(),
    escribirCodigo: (valor: string) => despachar({ tipo: 'codigo', valor }),
    ocultar: () => despachar({ tipo: 'ocultar' }),
  }
}

export type ControlRevelacion = ReturnType<typeof useRevelacion>

/** `clientes.verSensible`, con respaldo por rol (ASESOR, SUPERVISOR, ADMIN) */
export function usePuedeVerSensible() {
  const roles = useAuthStore((estado) => estado.user?.roles)
  const permisos = usePermisos()
  return usePuedeFuncion('clientes.verSensible', accesoDatosSensibles(roles ?? [], permisos).verSensible)
}
