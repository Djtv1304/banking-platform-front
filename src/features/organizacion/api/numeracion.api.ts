import { aceptadaSchema, ApiError, apiClient } from '@/shared/api'
import { ejemploNumeracionSchema, numeracionSchema, reglaNumeracionSchema, type ReglaNumeracion } from '@/features/organizacion/api/numeracion.contract'

const ruta = (id: number) => `/api/v1/productos/subproductos/${id}/numeracion`
export async function obtenerNumeracion(id: number, signal?: AbortSignal) { return numeracionSchema.parse((await apiClient.get(ruta(id), { signal })).data) }
export async function previsualizarNumeracion(id: number, regla: ReglaNumeracion, signal?: AbortSignal) { return ejemploNumeracionSchema.parse((await apiClient.post(`${ruta(id)}/ejemplo`, { regla: reglaNumeracionSchema.parse(regla), idAgencia: null }, { signal })).data) }
export async function solicitarNumeracion(id: number, regla: ReglaNumeracion) {
  const respuesta = await apiClient.put(ruta(id), reglaNumeracionSchema.parse(regla))
  if (respuesta.status !== 202) throw new ApiError('No se confirmo una solicitud pendiente. Consulta el estado antes de repetir.', respuesta.status, 'RESPUESTA_APROBACION_INVALIDA')
  return aceptadaSchema.parse(respuesta.data)
}
