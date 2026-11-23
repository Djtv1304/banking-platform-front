import { ApiError, apiClient } from '@/shared/api'
import {
  ASIENTOS_ENDPOINTS,
  asientoCreadoSchema,
  asientoSchema,
  paginaAsientosSchema,
  type AsientoManual,
} from '@/features/contabilidad/api/asientos.contract'

const RESPUESTA_INVALIDA = 'No pudimos leer la respuesta del servidor. Inténtalo más tarde.'

/** CON-04 · Asientos paginados (sin líneas). `params` ya trae filtros, paginación y orden */
export async function getAsientos(params: Record<string, string>) {
  const { data, status } = await apiClient.get<unknown>(ASIENTOS_ENDPOINTS.asientos, { params })
  const result = paginaAsientosSchema.safeParse(data)
  if (!result.success) throw new ApiError(RESPUESTA_INVALIDA, status, 'respuesta_invalida')
  return result.data
}

/** CON-05 · Un asiento con sus líneas; inexistente → 404 ASIENTO_NO_ENCONTRADO */
export async function getAsiento(idAsiento: number) {
  const { data, status } = await apiClient.get<unknown>(ASIENTOS_ENDPOINTS.asiento(idAsiento))
  const result = asientoSchema.safeParse(data)
  if (!result.success) throw new ApiError(RESPUESTA_INVALIDA, status, 'respuesta_invalida')
  return result.data
}

/** E4-04 · Borrador nuevo; el backend lo devuelve en BORRADOR con su id */
export async function crearAsiento(asiento: AsientoManual) {
  const { data, status } = await apiClient.post<unknown>(ASIENTOS_ENDPOINTS.asientos, asiento)
  const result = asientoCreadoSchema.safeParse(data)
  if (!result.success) throw new ApiError(RESPUESTA_INVALIDA, status, 'respuesta_invalida')
  return result.data
}

/** E4-04 · Cambiar un borrador (sólo BORRADOR) */
export async function actualizarAsiento(idAsiento: number, asiento: AsientoManual) {
  await apiClient.put(ASIENTOS_ENDPOINTS.asiento(idAsiento), asiento)
}

/** E4-04 · Enviar a aprobación: 202 = queda pendiente; otra persona lo aprueba en /aprobaciones */
export async function enviarAsiento(idAsiento: number) {
  const { status } = await apiClient.post(ASIENTOS_ENDPOINTS.envio(idAsiento))
  return { pendiente: status === 202 }
}
