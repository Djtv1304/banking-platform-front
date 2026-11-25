import { z } from 'zod'
import { apiClient } from '@/shared/api'

const tiposRetencion = ['OrdenJudicial', 'GarantiaCredito', 'Administrativa'] as const
export const RETENCIONES_TIPO = {
  OrdenJudicial: 'Orden judicial',
  GarantiaCredito: 'Garantía de crédito',
  Administrativa: 'Administrativa',
} as const

export type TipoRetencion = typeof tiposRetencion[number]
const esquemaRetencion = z.object({
  idRetencion: z.number(),
  tipoRetencion: z.enum(tiposRetencion),
  monto: z.coerce.number(),
  motivo: z.string(),
  documentoReferencia: z.string(),
  origen: z.enum(['Manual', 'Modulo']),
  fechaInicio: z.string(),
  fechaFin: z.string().nullable(),
  estado: z.string(),
  motivoLiberacion: z.string().nullable(),
})
const solicitud = z.object({ idSolicitud: z.number() })
const ruta = (cuenta: number) => `/api/v1/cuentas/${cuenta}/retenciones`

export async function consultarRetenciones(cuenta: number) {
  const { data } = await apiClient.get<unknown>(ruta(cuenta))
  return esquemaRetencion.array().parse(data)
}

export async function solicitarRetencion(cuenta: number, body: {
  tipoRetencion: TipoRetencion
  monto: string
  motivo: string
  documentoReferencia: string
  fechaFin: string | null
}) {
  const { data } = await apiClient.post<unknown>(ruta(cuenta), body)
  return solicitud.parse(data)
}

export async function solicitarLiberacion(cuenta: number, id: number, motivo: string) {
  const { data } = await apiClient.post<unknown>(`${ruta(cuenta)}/${id}/liberacion`, { motivo })
  return solicitud.parse(data)
}
