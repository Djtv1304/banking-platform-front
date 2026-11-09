import type { ApiError } from '@/shared/api'
import type { TipoTarjeta } from '@/features/tarjetas/api/tarjetas.contract'

/* Cómo se muestran los datos de una tarjeta (sin UI, para poder probarlo aparte) */

const DIA = new Intl.DateTimeFormat('es-EC', { dateStyle: 'long', timeZone: 'UTC' })

/**
 * «9 de noviembre de 2026». Un `YYYY-MM-DD` es un día sin hora: se formatea en UTC o se correría un
 * día en Ecuador. De una fecha con hora (resolución) se toma el día que escribió el backend.
 */
export function formatearDia(valor: string | null | undefined) {
  if (!valor) return '—'
  const dia = /^\d{4}-\d{2}-\d{2}/.exec(valor)?.[0]
  const fecha = dia ? new Date(`${dia}T00:00:00Z`) : null
  return fecha && !Number.isNaN(fecha.getTime()) ? DIA.format(fecha) : valor
}

export const etiquetaTipo = (tipo: TipoTarjeta) => (tipo === 'Debito' ? 'Débito' : 'Crédito')

export type TonoEstado = 'pendiente' | 'activa' | 'inactiva' | 'bloqueada' | 'terminal' | 'desconocido'

const TONOS: Record<string, TonoEstado> = {
  Solicitada: 'pendiente',
  Aprobada: 'pendiente',
  Generada: 'pendiente',
  Activa: 'activa',
  Inactiva: 'inactiva',
  Bloqueada: 'bloqueada',
  Cancelada: 'terminal',
  Anulada: 'terminal',
  Vencida: 'terminal',
  Cerrada: 'terminal',
}

/** Main y develop tienen estados distintos: uno que no conocemos se muestra con su texto y sin énfasis */
export const tonoEstado = (estado: string): TonoEstado => TONOS[estado] ?? 'desconocido'

const MENSAJES: Record<string, string> = {
  DATOS_INVALIDOS: 'Revisa los filtros: hay valores que no son válidos.',
}

/** Errores de TAR-02/03 por `code`; los demás muestran el mensaje del backend */
export function mensajeErrorTarjetas(error: ApiError) {
  if (error.status === 403) return 'No tienes permiso para consultar tarjetas.'
  return MENSAJES[error.code] ?? error.message
}
