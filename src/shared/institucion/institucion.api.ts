import { z } from 'zod'
import { ApiError, apiClient } from '@/shared/api'

export const INSTITUCION_KEY = ['institucion'] as const
export const INSTITUCION_URL = '/api/v1/institucion'
export const NOMBRE_PENDIENTE = 'Sistema de gestión'

export function esSitioSeguro(valor: string) {
  try {
    const url = new URL(valor)
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password
      && !Array.from(valor).some(caracter => caracter.charCodeAt(0) <= 32)
  } catch {
    return false
  }
}

export const institucionSchema = z.object({
  nombre: z.string().trim().min(1).nullable(),
  sitioWeb: z.string().refine(esSitioSeguro).nullable(),
  logoUrl: z.null(),
  origen: z.enum(['ENTIDAD', 'ENTORNO', 'SIN_CONFIGURAR']),
})

export type Institucion = z.infer<typeof institucionSchema>

export async function obtenerInstitucion(signal?: AbortSignal): Promise<Institucion> {
  const respuesta = await apiClient.get<unknown>(INSTITUCION_URL, { signal })
  const resultado = institucionSchema.safeParse(respuesta.data)
  if (respuesta.status !== 200 || !resultado.success) {
    throw new ApiError('No pudimos leer la presentación institucional.', respuesta.status, 'respuesta_invalida')
  }
  return resultado.data
}
