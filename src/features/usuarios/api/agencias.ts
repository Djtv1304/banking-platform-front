import { z } from 'zod'
import { apiClient, ApiError } from '@/shared/api'
import { agenciaAsignadaSchema } from '@/features/auth'

const asignacionesSchema = z.object({ idUsuario: z.number(), idAgenciaPrincipal: z.string().nullable(), agencias: z.array(agenciaAsignadaSchema), version: z.number().int().nonnegative() })
const historialSchema = z.object({ items: z.array(z.object({ idHistorial: z.number(), idAgencia: z.string().nullable(), accion: z.string(), principalAnterior: z.string().nullable(), principalNueva: z.string().nullable(), realizadoPor: z.number().nullable(), nombreActor: z.string().nullable().optional(), agenciaActor: z.string().nullable(), fechaUtc: z.string() })), page: z.number(), pageSize: z.number(), total: z.number() })
export type Asignaciones = z.infer<typeof asignacionesSchema>
export interface CambioAsignaciones { idAgencias: string[]; idAgenciaPrincipal: string | null; version: number }
const base = (id: number) => `/api/v1/usuarios/${id}/agencias`
export async function obtenerAsignaciones(id: number, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>(base(id), { signal })
  const result = asignacionesSchema.safeParse(data)
  if (!result.success || result.data.idUsuario !== id) throw new ApiError('No se pudieron verificar las asignaciones.', 200, 'respuesta_invalida')
  return result.data
}
export async function guardarAsignaciones(id: number, cambio: CambioAsignaciones) {
  const { data } = await apiClient.put<unknown>(base(id), cambio)
  const result = asignacionesSchema.parse(data)
  if (result.idUsuario !== id) throw new ApiError('La respuesta no corresponde al usuario.', 200, 'respuesta_invalida')
  return result
}
export async function obtenerHistorialAgencias(id: number, page: number, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>(base(id) + '/historial', { params: { page, pageSize: 20 }, signal })
  return historialSchema.parse(data)
}
