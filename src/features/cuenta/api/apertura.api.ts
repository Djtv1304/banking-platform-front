import { ApiError, apiClient } from '@/shared/api'
import { APERTURA_ENDPOINT, cuentaAbiertaSchema, type CuentaCreate } from '@/features/cuenta/api/apertura.contract'

const RESPUESTA_INVALIDA = 'No pudimos leer la respuesta del servidor. Revisa en la búsqueda si la cuenta se abrió.'

/** CTA-01 · Abre la cuenta; es irreversible, así que nunca se reintenta */
export async function abrirCuenta(body: CuentaCreate) {
  const { data, status } = await apiClient.post<unknown>(APERTURA_ENDPOINT, body)
  const result = cuentaAbiertaSchema.safeParse(data)
  if (!result.success) throw new ApiError(RESPUESTA_INVALIDA, status, 'respuesta_invalida')
  return result.data
}
