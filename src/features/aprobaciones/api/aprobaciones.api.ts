import { aceptadaSchema, apiClient, ApiError } from '@/shared/api'
import { accesosSchema, bandejaSchema, detalleSchema, notificacionesSchema, resultadoSchema, type Accion, type BandejaNombre, type SolicitudEntrada } from '@/features/aprobaciones/api/aprobaciones.contract'

const BASE = '/api/v1/aprobaciones'
export async function obtenerAccesos() { return accesosSchema.parse((await apiClient.get(`${BASE}/accesos`)).data) }
export async function obtenerNotificaciones() { return notificacionesSchema.parse((await apiClient.get(`${BASE}/notificaciones`)).data) }
export async function obtenerBandeja(bandeja: BandejaNombre, page: number) { return bandejaSchema.parse((await apiClient.get(BASE, { params: { bandeja, page, pageSize: 20 } })).data) }
export async function obtenerSolicitud(id: number) { return detalleSchema.parse((await apiClient.get(`${BASE}/${id}`)).data) }
export async function resolverSolicitud(id: number, accion: Accion, comentario: string) { return resultadoSchema.parse((await apiClient.post(`${BASE}/${id}/${accion}`, { comentario })).data) }
export async function solicitarAprobacion(datos: SolicitudEntrada) {
  const respuesta = await apiClient.post(BASE, datos)
  if (respuesta.status !== 202) throw new ApiError('El servidor no confirmo una solicitud pendiente. Consulta el estado antes de repetir.', respuesta.status, 'RESPUESTA_APROBACION_INVALIDA')
  return aceptadaSchema.parse(respuesta.data)
}
