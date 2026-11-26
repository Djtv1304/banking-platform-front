import { toApiError } from '@/shared/api'

export const MENSAJE_CLIENTE_ELIMINADO =
  'Esta persona fue cliente y está eliminada. Puedes solicitar su reincorporación con los datos que ingresaste; la aprobará un supervisor o administrador y el cliente quedará pendiente hasta una nueva evaluación de riesgo.'

export const BOTON_SOLICITAR_REINCORPORACION = 'Solicitar reincorporación'

export function esErrorClienteEliminado(error: unknown): boolean {
  if (!error) return false
  return toApiError(error).code === 'CLIENTE_ELIMINADO'
}

export type DecisionAvisoAlta =
  | { tipo: 'aprobacion'; idSolicitud: number }
  | { tipo: 'reincorporacion'; mensaje: string; boton: string }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'ninguno' }

export function resolverAvisoAlta({
  error,
  idSolicitud,
}: {
  error?: unknown
  idSolicitud?: number | null
}): DecisionAvisoAlta {
  if (idSolicitud !== null && idSolicitud !== undefined) {
    return { tipo: 'aprobacion', idSolicitud }
  }
  if (esErrorClienteEliminado(error)) {
    return {
      tipo: 'reincorporacion',
      mensaje: MENSAJE_CLIENTE_ELIMINADO,
      boton: BOTON_SOLICITAR_REINCORPORACION,
    }
  }
  return { tipo: 'ninguno' }
}
