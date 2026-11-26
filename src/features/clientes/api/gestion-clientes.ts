import { z } from 'zod'
import { aceptadaSchema, ApiError, apiClient } from '@/shared/api'
import { clienteSchema } from '@/features/clientes/api/clientes.contract'

export type { Cliente, EstadoCliente } from '@/features/clientes/api/clientes.contract'

export const estadoDestinoSchema = z.enum(['Activo', 'Inactivo', 'Suspendido', 'Bloqueado', 'Eliminado'])
export type EstadoDestino = z.infer<typeof estadoDestinoSchema>
const texto = z.string().trim().min(1).max(250)

/** E5-04 · se aplican al instante (200) */
export const CAMPOS_ORDINARIOS = ['nombreComercial', 'idActividadEconomica', 'estadoCivil', 'telefonoConvencional', 'telefonoCelular'] as const
/** E5-04 · los aprueba otra persona (202); el cliente no cambia hasta entonces */
export const CAMPOS_SENSIBLES = ['nombres', 'apellidos', 'razonSocial', 'fechaNacimiento', 'tipoDocumento', 'identificacion', 'email'] as const

export const clienteUpdateSchema = z.strictObject({
  nombres: texto.optional(), apellidos: texto.nullable().optional(), razonSocial: texto.nullable().optional(),
  nombreComercial: texto.nullable().optional(), idActividadEconomica: z.number().int().positive().nullable().optional(),
  estadoCivil: z.enum(['Soltero', 'Casado', 'Divorciado', 'Viudo', 'Union Libre']).nullable().optional(),
  telefonoConvencional: z.string().max(15).nullable().optional(),
  telefonoCelular: z.string().trim().min(7).max(15).optional(),
  email: z.string().trim().min(5).max(150).pipe(z.email()).transform((correo) => correo.toLowerCase()).optional(),
  fechaNacimiento: z.iso.date().optional(),
  tipoDocumento: z.enum(['C', 'R', 'P']).optional(),
  identificacion: z.string().trim().min(1).max(13).optional(),
})
  .refine((datos) => Object.keys(datos).length > 0, 'No hay cambios para guardar.')
  // El backend responde 422 CAMBIO_MIXTO: cada sección se guarda por separado.
  .refine((datos) => {
    const campos = Object.keys(datos)
    const sensibles = campos.filter((campo) => (CAMPOS_SENSIBLES as readonly string[]).includes(campo))
    return sensibles.length === 0 || sensibles.length === campos.length
  }, 'Guarde por separado los datos que requieren aprobación.')
export type ClienteUpdate = z.input<typeof clienteUpdateSchema>
export const estadoUpdateSchema = z.strictObject({ estado: estadoDestinoSchema, motivo: z.string().trim().min(1).max(300) })

const historialSchema = z.object({
  idHistorial: z.number(), tipoOperacion: z.string(), campoModificado: z.string(), valorAnterior: z.string().nullable(),
  /** E5-04 · columnas propias; null en el legado */
  valorNuevo: z.string().nullish(), idSolicitud: z.number().nullish(),
  modificadoPor: z.number(), direccionIP: z.string(), fechaModificacion: z.string(), observaciones: z.string(),
})
const paginaHistorialSchema = z.object({ items: z.array(historialSchema), page: z.number(), pageSize: z.number(), total: z.number() })
export type CambioHistorial = z.infer<typeof historialSchema>
export const historialClienteKey = (id: number) => ['clientes', 'historial', id] as const

function validar<T extends z.ZodType>(schema: T, data: unknown, status: number): z.infer<T> {
  const resultado = schema.safeParse(data)
  if (!resultado.success) throw new ApiError('No pudimos leer la respuesta del servidor.', status, 'respuesta_invalida')
  return resultado.data
}

export type ResultadoEdicion =
  | { tipo: 'cliente'; cliente: z.infer<typeof clienteSchema> }
  | { tipo: 'solicitud'; idSolicitud: number }

export type ResultadoCambioEstado =
  | { tipo: 'cliente'; cliente: z.infer<typeof clienteSchema> }
  | { tipo: 'solicitud'; idSolicitud: number }

export async function editarCliente(id: number, cambios: ClienteUpdate): Promise<ResultadoEdicion> {
  const { data, status } = await apiClient.patch<unknown>(`/api/v1/clientes/${id}`, clienteUpdateSchema.parse(cambios))
  if (status === 202) return { tipo: 'solicitud', idSolicitud: validar(aceptadaSchema, data, status).idSolicitud }
  return { tipo: 'cliente', cliente: validar(clienteSchema, data, status) }
}

export async function cambiarEstadoCliente(id: number, estado: EstadoDestino, motivo: string): Promise<ResultadoCambioEstado> {
  const { data, status } = await apiClient.patch<unknown>(`/api/v1/clientes/${id}/estado`, estadoUpdateSchema.parse({ estado, motivo }))
  if (status === 202) return { tipo: 'solicitud', idSolicitud: validar(aceptadaSchema, data, status).idSolicitud }
  return { tipo: 'cliente', cliente: validar(clienteSchema, data, status) }
}

export async function obtenerHistorial(id: number, page: number, signal?: AbortSignal) {
  const { data, status } = await apiClient.get<unknown>(`/api/v1/clientes/${id}/historial`, {
    signal, params: { page, pageSize: 20, sort: 'fechaModificacion,desc' },
  })
  return validar(paginaHistorialSchema, data, status)
}
