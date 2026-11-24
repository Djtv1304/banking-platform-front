import { aceptadaSchema, apiClient, ApiError } from '@/shared/api'
import { accesosSchema, bandejaSchema, detalleSchema, notificacionesSchema, resultadoSchema, type Accion, type BandejaNombre, type SolicitudEntrada } from '@/features/aprobaciones/api/aprobaciones.contract'

const BASE = '/api/v1/aprobaciones'
export async function obtenerAccesos() { return accesosSchema.parse((await apiClient.get(`${BASE}/accesos`)).data) }
export async function obtenerNotificaciones() { return notificacionesSchema.parse((await apiClient.get(`${BASE}/notificaciones`)).data) }
export async function obtenerBandeja(bandeja: BandejaNombre, page: number) { return bandejaSchema.parse((await apiClient.get(BASE, { params: { bandeja, page, pageSize: 20 } })).data) }
export async function obtenerSolicitud(id: number) {
  const { data } = await apiClient.get(BASE + '/' + id)
  const solicitud = detalleSchema.parse(data)
  if (solicitud.idSolicitud !== id) throw new ApiError('La respuesta corresponde a otra solicitud.', 200, 'RESPUESTA_APROBACION_INVALIDA')
  return solicitud
}
export async function resolverSolicitud(id: number, accion: Accion, comentario: string) {
  const { data, status } = await apiClient.post(BASE + '/' + id + '/' + accion, { comentario })
  const resultado = resultadoSchema.safeParse(data)
  if (!resultado.success || resultado.data.idSolicitud !== id) {
    throw new ApiError('Consulta la solicitud para confirmar el resultado.', status, 'RESPUESTA_APROBACION_INVALIDA')
  }
  return resultado.data
}
export async function solicitarAprobacion(datos: SolicitudEntrada) {
  const respuesta = await apiClient.post(BASE, datos)
  if (respuesta.status !== 202) throw new ApiError('El servidor no confirmo una solicitud pendiente. Consulta el estado antes de repetir.', respuesta.status, 'RESPUESTA_APROBACION_INVALIDA')
  return aceptadaSchema.parse(respuesta.data)
}
