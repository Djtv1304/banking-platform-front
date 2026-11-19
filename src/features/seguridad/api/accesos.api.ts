import { z } from 'zod'
import { ApiError, apiClient } from '@/shared/api'
import { pestanaRolesSchema, type PestanaRoles } from '@/features/seguridad/api/seguridad.contract'

const configuracionSchema = z.object({
  version: z.string().regex(/^[a-f0-9]{64}$/),
  activa: z.boolean(),
  pestanas: z.array(pestanaRolesSchema),
  secciones: z.array(z.object({ ruta: z.string(), nombre: z.string(), roles: z.array(z.string()) })),
})
const guardadoSchema = configuracionSchema.extend({ estado: z.literal('GUARDADO') })
export type ConfiguracionAccesos = z.infer<typeof configuracionSchema>
export interface GuardarAccesos { version: string; motivo: string; pestanas: PestanaRoles[] }
const URL = '/api/v1/seguridad/pestanas/configuracion'

export async function consultarConfiguracion(signal?: AbortSignal): Promise<ConfiguracionAccesos> {
  const { data, status } = await apiClient.get<unknown>(URL, { signal })
  const resultado = configuracionSchema.safeParse(data)
  if (status !== 200 || !resultado.success) throw new ApiError('No pudimos leer la configuración de accesos.', status, 'respuesta_invalida')
  return resultado.data
}

export async function guardarConfiguracion(datos: GuardarAccesos) {
  const { data, status } = await apiClient.put<unknown>(URL, datos)
  const resultado = guardadoSchema.safeParse(data)
  if (status !== 200 || !resultado.success) throw new ApiError('No pudimos confirmar el guardado. Consulta el estado actual antes de reintentar.', status, 'resultado_no_confirmado')
  return resultado.data
}

export function exigeReconsulta(error: unknown): boolean {
  return !(error instanceof ApiError) || error.status === null || error.status === 409 || error.status >= 500 || error.code === 'resultado_no_confirmado'
}
