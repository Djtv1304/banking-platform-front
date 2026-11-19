import { aceptadaSchema, apiClient, ApiError } from '@/shared/api'
import { vigenciasSchema, type ClaseConjunto } from '@/features/organizacion/api/programacion.contract'

const base = (id: number) => `/api/v1/productos/subproductos/${id}`
export async function consultarVigencias(id: number, signal?: AbortSignal) {
  const { data, status } = await apiClient.get<unknown>(`${base(id)}/vigencias`, { signal })
  const resultado = vigenciasSchema.safeParse(data)
  if (!resultado.success) throw new ApiError('No pudimos leer las vigencias del servidor.', status, 'respuesta_invalida')
  return resultado.data
}
export async function programarConjunto(id: number, clase: ClaseConjunto, datos: Record<string, unknown>) {
  const respuesta = clase === 'cupos' ? await apiClient.put<unknown>(`${base(id)}/cupos`, datos) : await apiClient.post<unknown>(`${base(id)}/${clase}`, datos)
  const resultado = aceptadaSchema.safeParse(respuesta.data)
  if (respuesta.status !== 202 || !resultado.success) throw new ApiError('No se recibio la confirmacion de aprobacion pendiente.', respuesta.status, 'respuesta_invalida')
  return resultado.data
}
export async function cancelarConjunto(id: number, clase: ClaseConjunto, idRegistro: number) {
  const ruta = clase === 'cupos' ? `${base(id)}/cupos/programaciones/${idRegistro}` : `${base(id)}/${clase}/${idRegistro}`
  const { data, status } = await apiClient.delete<unknown>(ruta)
  const resultado = aceptadaSchema.safeParse(data)
  if (status !== 202 || !resultado.success) throw new ApiError('No se recibio la confirmacion de cancelacion pendiente.', status, 'respuesta_invalida')
  return resultado.data
}
export async function finalizarRestriccion(id: number, idRegistro: number, vigenciaHasta: string) {
  const { data, status } = await apiClient.post<unknown>(`${base(id)}/restricciones/${idRegistro}/fin`, { vigenciaHasta })
  const resultado = aceptadaSchema.safeParse(data)
  if (status !== 202 || !resultado.success) throw new ApiError('No se recibio la confirmacion de finalizacion pendiente.', status, 'respuesta_invalida')
  return resultado.data
}
