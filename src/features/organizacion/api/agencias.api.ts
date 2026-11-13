import { ApiError, apiClient } from '@/shared/api'
import {
  AGENCIAS_ENDPOINTS,
  agenciaDetalleSchema,
  type AgenciaCreate,
  type AgenciaUpdate,
} from '@/features/organizacion/api/agencias.contract'

const RESPUESTA_INVALIDA = 'No pudimos leer la respuesta del servidor. Inténtalo más tarde.'

/** Si la forma no es la esperada (p. ej. HTML sin backend) se rechaza en vez de dar por hecho el cambio */
function validar(data: unknown, status: number) {
  const result = agenciaDetalleSchema.safeParse(data)
  if (!result.success) throw new ApiError(RESPUESTA_INVALIDA, status, 'respuesta_invalida')
  return result.data
}

/** Detalle de una agencia: trae ciudad, teléfono y dirección para precargar la edición */
export async function obtenerAgencia(idAgencia: string) {
  const { data, status } = await apiClient.get<unknown>(AGENCIAS_ENDPOINTS.agencia(idAgencia))
  return validar(data, status)
}

/** ORG-01 · 201 con la agencia creada en estado `A` */
export async function crearAgencia(body: AgenciaCreate) {
  const { data, status } = await apiClient.post<unknown>(AGENCIAS_ENDPOINTS.crear, body)
  return validar(data, status)
}

/** ORG-02 · Edición parcial, también para desactivar (`I`) o reactivar (`A`) con motivo */
export async function actualizarAgencia(idAgencia: string, body: AgenciaUpdate) {
  const { data, status } = await apiClient.patch<unknown>(AGENCIAS_ENDPOINTS.agencia(idAgencia), body)
  return validar(data, status)
}
