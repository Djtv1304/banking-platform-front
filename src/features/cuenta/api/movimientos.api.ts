import { ApiError, apiClient } from '@/shared/api'
import { MOVIMIENTOS_ENDPOINTS, paginaMovimientosSchema } from '@/features/cuenta/api/movimientos.contract'

const RESPUESTA_INVALIDA = 'No pudimos leer la respuesta del servidor. Inténtalo más tarde.'

/**
 * CTA-06 · Movimientos propios de la cuenta, más recientes primero. `params` ya trae las fechas
 * (obligatorias) y la paginación. Cuenta inexistente → 404 CUENTA_NO_ENCONTRADA; fechas invertidas
 * → 400 RANGO_FECHAS_INVALIDO.
 */
export async function getMovimientos(idCuenta: number, params: Record<string, string>) {
  const { data, status } = await apiClient.get<unknown>(MOVIMIENTOS_ENDPOINTS.movimientos(idCuenta), { params })
  const result = paginaMovimientosSchema.safeParse(data)
  if (!result.success) throw new ApiError(RESPUESTA_INVALIDA, status, 'respuesta_invalida')
  return result.data
}
