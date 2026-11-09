import { z } from 'zod'
import { ApiError, apiClient } from '@/shared/api'
import { clienteSchema } from '@/features/clientes/api/clientes.contract'

export type { Cliente, EstadoCliente } from '@/features/clientes/api/clientes.contract'

export const estadoDestinoSchema = z.enum(['Activo', 'Inactivo', 'Suspendido', 'Bloqueado', 'Eliminado'])
export type EstadoDestino = z.infer<typeof estadoDestinoSchema>
const texto = z.string().trim().min(1).max(250)
export const clienteUpdateSchema = z.strictObject({
  nombres: texto.optional(), apellidos: texto.nullable().optional(), razonSocial: texto.nullable().optional(),
  nombreComercial: texto.nullable().optional(), idActividadEconomica: z.number().int().positive().nullable().optional(),
  estadoCivil: z.enum(['Soltero', 'Casado', 'Divorciado', 'Viudo', 'Union Libre']).nullable().optional(),
  telefonoConvencional: z.string().max(15).nullable().optional(),
  telefonoCelular: z.string().trim().min(7).max(15).optional(),
  email: z.string().trim().min(5).max(150).pipe(z.email()).optional(),
}).refine((datos) => Object.keys(datos).length > 0, 'No hay cambios para guardar.')
export type ClienteUpdate = z.infer<typeof clienteUpdateSchema>
export const estadoUpdateSchema = z.strictObject({ estado: estadoDestinoSchema, motivo: z.string().trim().min(1).max(500) })

const historialSchema = z.object({
  idHistorial: z.number(), tipoOperacion: z.string(), campoModificado: z.string(), valorAnterior: z.string().nullable(),
  modificadoPor: z.number(), direccionIP: z.string(), fechaModificacion: z.string(), observaciones: z.string(),
})
const paginaHistorialSchema = z.object({ items: z.array(historialSchema), page: z.number(), pageSize: z.number(), total: z.number() })
export const historialClienteKey = (id: number) => ['clientes', 'historial', id] as const

function validar<T extends z.ZodType>(schema: T, data: unknown, status: number): z.infer<T> {
  const resultado = schema.safeParse(data)
  if (!resultado.success) throw new ApiError('No pudimos leer la respuesta del servidor.', status, 'respuesta_invalida')
  return resultado.data
}

export async function editarCliente(id: number, cambios: ClienteUpdate) {
  const { data, status } = await apiClient.patch<unknown>(`/api/v1/clientes/${id}`, clienteUpdateSchema.parse(cambios))
  return validar(clienteSchema, data, status)
}

export async function cambiarEstadoCliente(id: number, estado: EstadoDestino, motivo: string) {
  const { data, status } = await apiClient.patch<unknown>(`/api/v1/clientes/${id}/estado`, estadoUpdateSchema.parse({ estado, motivo }))
  return validar(clienteSchema, data, status)
}

export async function obtenerHistorial(id: number, page: number, signal?: AbortSignal) {
  const { data, status } = await apiClient.get<unknown>(`/api/v1/clientes/${id}/historial`, {
    signal, params: { page, pageSize: 20, sort: 'fechaModificacion,desc' },
  })
  return validar(paginaHistorialSchema, data, status)
}
