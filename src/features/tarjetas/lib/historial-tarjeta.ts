import { z } from 'zod'

import type { OrigenPin } from '@/features/tarjetas/api/tarjetas.contract'
import { PAGE_SIZE } from '@/features/tarjetas/lib/consulta'

/* Historial de la tarjeta (TAR-06): textos y filtro, sin UI para poder probarlos aparte */

const EVENTOS: Record<string, string> = {
  Bloqueo: 'Bloqueo',
  Desbloqueo: 'Desbloqueo',
  Activacion: 'Activación',
  Anulacion: 'Anulación',
  CambioEstado: 'Cambio de estado',
  CambioPin: 'Cambio de PIN',
}

/** Un evento que el front no conoce se muestra con el texto del backend */
export const etiquetaEvento = (tipoEvento: string) => EVENTOS[tipoEvento] ?? tipoEvento

const ORIGENES: Record<OrigenPin, string> = {
  Generacion: 'Generación',
  Regeneracion: 'Regeneración',
  Cliente: 'Cliente',
}

/** Solo en CambioPin; en el resto (o si el backend no lo reconoce) «—» */
export const etiquetaOrigenPin = (tipoEvento: string, origen: OrigenPin | null | undefined) =>
  tipoEvento === 'CambioPin' && origen ? ORIGENES[origen] : '—'

/** «COMPLETADO» → «Completado» */
export const etiquetaResultado = (resultado: string | null | undefined) =>
  resultado ? resultado.charAt(0).toUpperCase() + resultado.slice(1).toLowerCase() : '—'

/** Rango opcional; cada fecha llega como ISO completo, vacío o el borrador de FechaInput */
export const filtroHistorialSchema = z
  .object({
    fechaDesde: z.union([z.literal(''), z.iso.date({ error: 'Ingresa una fecha válida.' })]),
    fechaHasta: z.union([z.literal(''), z.iso.date({ error: 'Ingresa una fecha válida.' })]),
  })
  .refine(({ fechaDesde, fechaHasta }) => !fechaDesde || !fechaHasta || fechaDesde <= fechaHasta, {
    path: ['fechaHasta'],
    error: 'Debe ser igual o posterior a la fecha «Desde».',
  })

export type FiltroHistorial = z.output<typeof filtroHistorialSchema>

export const FILTRO_HISTORIAL_VACIO: FiltroHistorial = { fechaDesde: '', fechaHasta: '' }

/** Parámetros de TAR-06 sin fechas vacías (el backend no acepta parámetros vacíos) */
export function parametrosHistorial(filtro: FiltroHistorial, page: number) {
  const params: Record<string, string> = { page: String(page), pageSize: String(PAGE_SIZE) }
  if (filtro.fechaDesde) params.fechaDesde = filtro.fechaDesde
  if (filtro.fechaHasta) params.fechaHasta = filtro.fechaHasta
  return params
}
