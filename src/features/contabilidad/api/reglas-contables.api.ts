import { z } from 'zod'
import { ApiError, apiClient, toApiError } from '@/shared/api'

const agencia = z.string().regex(/^\d{3}$/)
const camposComunes = {
  idRegla: z.string(),
  Origen: z.string(),
  CodigoTipoAsiento: z.string().nullable(),
  configurada: z.literal(true),
  desde: z.string().nullable(),
  hacia: z.string().nullable(),
  consumidor: z.string().nullable(),
  integracion: z.enum(['CONECTADA', 'PENDIENTE', 'SIN_VERIFICAR']),
}

const versionada = z.object({
  ...camposComunes,
  fuente: z.literal('PLANTILLA_ASIENTO'),
  versionada: z.literal(true),
  IdPlantillaAsiento: z.number().int(),
  CodigoPlantilla: z.string(),
  Version: z.number().int(),
  IdAgencia: agencia.nullable(),
  Nombre: z.string(),
  VigenciaDesde: z.iso.date(),
  VigenciaHasta: z.iso.date().nullable(),
  Estado: z.boolean(),
  CodigoConcepto: z.string().nullable(),
  Prioridad: z.number().int().positive().nullable(),
  vigente: z.boolean().nullable(),
  Usada: z.boolean(),
})

const boveda = z.object({
  ...camposComunes,
  fuente: z.literal('PLANTILLA_BOVEDA'),
  versionada: z.literal(false),
  IdAgencia: agencia,
  TipoMovimiento: z.string(),
  Naturaleza: z.enum(['I', 'E']),
  EstadoTipo: z.string().nullable(),
  EsManual: z.boolean().nullable(),
  Debe: z.string().nullable(),
  Haber: z.string().nullable(),
  Habilitada: z.boolean(),
  Version: z.null(),
  vigente: z.null(),
})

const respuesta = z.object({
  fechaContable: z.iso.date().nullable(),
  matrizBovedaDisponible: z.boolean(),
  reglas: z.array(z.discriminatedUnion('fuente', [versionada, boveda])),
})

export type ReglaContable = z.infer<typeof respuesta>['reglas'][number]
export type ReglaBoveda = z.infer<typeof boveda>
export type ReglaVersionada = z.infer<typeof versionada>

export async function consultarReglasContables(params: { fecha?: string; agencia?: string }, signal?: AbortSignal) {
  try {
    const { data } = await apiClient.get('/api/v1/contabilidad/reglas-contables', { params, signal })
    return respuesta.parse(data)
  } catch (error) {
    const api = toApiError(error)
    if (api.status === 404) {
      throw new ApiError('El catálogo de reglas contables todavía no está disponible en este entorno.', api.status, api.code, api.fields, api.traceId)
    }
    throw error
  }
}
