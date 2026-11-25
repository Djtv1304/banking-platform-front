import { z } from 'zod'
import { ApiError, apiClient } from '@/shared/api'

export const clienteEmailSchema = z.object({
  idClienteEmail: z.number(), email: z.string(), etiqueta: z.string(), verificado: z.boolean(),
  fechaVerificacion: z.string().nullable(), fechaCreacion: z.string(),
})
export type ClienteEmail = z.infer<typeof clienteEmailSchema>

export const clienteEmailNuevoSchema = z.strictObject({
  email: z.string().trim().toLowerCase().pipe(z.email().min(5).max(150)),
  etiqueta: z.string().trim().min(1).max(30).regex(/^\P{Cc}+$/u),
})
export type ClienteEmailNuevo = z.input<typeof clienteEmailNuevoSchema>

const verificacionPrincipalSchema = z.object({ emailVerificado: z.literal(true), fechaEmailVerificado: z.string() })

export const correosClienteKey = (id: number) => ['clientes', 'correos', id] as const

const base = (id: number) => `/api/v1/clientes/${id}`

function validar<T extends z.ZodType>(schema: T, data: unknown, status: number): z.infer<T> {
  const resultado = schema.safeParse(data)
  if (!resultado.success) throw new ApiError('No pudimos leer la respuesta del servidor.', status, 'respuesta_invalida')
  return resultado.data
}

export async function listarCorreos(id: number, signal?: AbortSignal) {
  const { data, status } = await apiClient.get<unknown>(`${base(id)}/emails`, { signal })
  return validar(clienteEmailSchema.array(), data, status)
}

export async function agregarCorreo(id: number, datos: ClienteEmailNuevo) {
  const { data, status } = await apiClient.post<unknown>(`${base(id)}/emails`, clienteEmailNuevoSchema.parse(datos))
  return validar(clienteEmailSchema, data, status)
}

export async function eliminarCorreo(id: number, idEmail: number) {
  await apiClient.delete(`${base(id)}/emails/${idEmail}`)
}

export async function verificarCorreoPrincipal(id: number) {
  const { data, status } = await apiClient.post<unknown>(`${base(id)}/email/verificacion`)
  return validar(verificacionPrincipalSchema, data, status)
}

export async function verificarCorreoSecundario(id: number, idEmail: number) {
  const { data, status } = await apiClient.post<unknown>(`${base(id)}/emails/${idEmail}/verificacion`)
  return validar(clienteEmailSchema, data, status)
}
