import { z } from 'zod'
import { aceptadaSchema, ApiError, apiClient } from '@/shared/api'

const base = '/api/v1/parametros/comisiones'
const estado = z.enum(['A', 'I'])
const vigencia = { vigenciaDesde: z.iso.date(), vigenciaHasta: z.iso.date().nullable() }
const comision = z.object({
  idComision: z.number().int().positive(), codigoComision: z.string(), tipoComision: z.string(),
  tipoCalculo: z.string(), valor: z.number(), montoMinimo: z.number().nullable(),
  montoMaximo: z.number().nullable(), idCanal: z.number(), descripcion: z.string(),
  ...vigencia, estado, idCuentaContableIngreso: z.number().int().nullable(),
  asociaciones: z.array(z.object({
    idComisionTipoTransaccion: z.number().int(), codigoTipoTransaccion: z.string(),
    ...vigencia, estado, registradoPor: z.number().int(),
  })),
})
export const tarifaHistorica = z.object({
  idComision: z.number().int().positive(), ...vigencia, valor: z.string().regex(/^\d+(?:\.\d+)?$/),
})
export type Comision = z.infer<typeof comision>
type Metadatos = Pick<Comision, 'descripcion' | 'estado' | 'idCuentaContableIngreso'>
export type CambioComision =
  | (Partial<Metadatos> & { valor?: never; vigenciaDesde?: never })
  | { valor: string; vigenciaDesde: string; descripcion?: never; estado?: never; idCuentaContableIngreso?: never }

export function cambiosMetadatos(actual: Metadatos, nuevo: Metadatos): Partial<Metadatos> {
  return {
    ...(nuevo.descripcion !== actual.descripcion && { descripcion: nuevo.descripcion }),
    ...(nuevo.estado !== actual.estado && { estado: nuevo.estado }),
    ...(nuevo.idCuentaContableIngreso !== actual.idCuentaContableIngreso && { idCuentaContableIngreso: nuevo.idCuentaContableIngreso }),
  }
}

export function resultadoComision(status: number, data: unknown) {
  if (status === 202) return { tipo: 'solicitud' as const, ...aceptadaSchema.parse(data) }
  if (status === 200) return { tipo: 'actualizada' as const, comision: comision.parse(data) }
  throw new ApiError('El servidor no confirmó el cambio de comisión.', status, 'RESPUESTA_COMISION_INVALIDA')
}

export async function listarComisiones(signal?: AbortSignal) {
  return comision.array().parse((await apiClient.get(base, { signal })).data)
}

export async function consultarTarifa(id: number, fecha: string, signal?: AbortSignal) {
  return tarifaHistorica.parse((await apiClient.get(`${base}/${id}/tarifa`, { params: { fecha }, signal })).data)
}

export async function cambiarComision(id: number, cambio: CambioComision) {
  const { status, data } = await apiClient.patch(`${base}/${id}`, cambio)
  return resultadoComision(status, data)
}
