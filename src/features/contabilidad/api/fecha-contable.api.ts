import { ApiError, apiClient } from '@/shared/api'
import { FECHA_CONTABLE_ENDPOINTS, fechaContableSchema } from '@/features/contabilidad/api/fecha-contable.contract'

const RESPUESTA_INVALIDA = 'No pudimos leer la respuesta del servidor. Inténtalo más tarde.'

async function leerFecha(url: string) {
  const { data, status } = await apiClient.get<unknown>(url)
  const result = fechaContableSchema.safeParse(data)
  if (!result.success) throw new ApiError(RESPUESTA_INVALIDA, status, 'respuesta_invalida')
  return result.data
}

/** CON-01 · Fecha contable vigente según la hora de corte */
export const getFechaContableActual = () => leerFecha(FECHA_CONTABLE_ENDPOINTS.actual)

/** CON-01 · Una fecha del calendario; fuera del calendario → 404, mal escrita → 400 FECHA_INVALIDA */
export const getFechaContable = (fecha: string) => leerFecha(FECHA_CONTABLE_ENDPOINTS.fecha(fecha))
