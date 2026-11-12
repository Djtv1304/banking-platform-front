import type { z } from 'zod'

import { ApiError, apiClient } from '@/shared/api'
import { ENTIDAD_ENDPOINT, entidadSchema, type EntidadUpdate } from '@/features/organizacion/api/entidad.contract'

const RESPUESTA_INVALIDA = 'No pudimos leer la respuesta del servidor. Inténtalo más tarde.'

/** Si la forma no es la esperada (p. ej. HTML sin backend) se rechaza en vez de romper la pantalla */
function validar<T extends z.ZodType>(schema: T, data: unknown, status: number): z.infer<T> {
  const result = schema.safeParse(data)
  if (!result.success) throw new ApiError(RESPUESTA_INVALIDA, status, 'respuesta_invalida')
  return result.data
}

/** Devuelve la entidad aunque esté inactiva · Sin registro → 404 ENTIDAD_NO_ENCONTRADA */
export async function getEntidad() {
  const { data, status } = await apiClient.get<unknown>(ENTIDAD_ENDPOINT)
  return validar(entidadSchema, data, status)
}

/** Edición parcial (ADMIN) · Devuelve la entidad completa tal como quedó guardada */
export async function actualizarEntidad(body: EntidadUpdate) {
  const { data, status } = await apiClient.patch<unknown>(ENTIDAD_ENDPOINT, body)
  return validar(entidadSchema, data, status)
}
