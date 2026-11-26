import type { z } from 'zod'

import { ApiError, apiClient } from '@/shared/api'
import {
  clienteSchema,
  CUENTAS_ENDPOINTS,
  cuentaSchema,
  pageSchema,
  saldoCuentaSchema,
} from '@/features/cuenta/api/cuentas.contract'

const RESPUESTA_INVALIDA = 'No pudimos leer la respuesta del servidor. Inténtalo más tarde.'

/**
 * GET y validación de la forma de la respuesta. Si no es la esperada (p. ej. HTML porque el
 * backend no está conectado) se rechaza con un ApiError en vez de romper la pantalla.
 */
async function getValidado<T extends z.ZodType>(url: string, schema: T, params?: Record<string, string>) {
  const { data, status } = await apiClient.get<unknown>(url, { params })
  const result = schema.safeParse(data)
  if (!result.success) throw new ApiError(RESPUESTA_INVALIDA, status, 'respuesta_invalida')
  return result.data as z.infer<T>
}

/** CLI-03 · `null` si no hay un cliente con esa identificación */
export async function buscarIdCliente(identificacion: string) {
  const { data, status } = await apiClient.post<unknown>(CUENTAS_ENDPOINTS.clientes, { identificacion, pageSize: 1 })
  const result = pageSchema(clienteSchema).safeParse(data)
  if (!result.success) throw new ApiError(RESPUESTA_INVALIDA, status, 'respuesta_invalida')
  return result.data.items[0]?.idCliente ?? null
}

/** CTA-02 · `params` ya viene sin filtros vacíos (ver `armarParametros`) */
export const buscarCuentas = (params: Record<string, string>) =>
  getValidado(CUENTAS_ENDPOINTS.buscar, pageSchema(cuentaSchema), params)

/** CTA-03 · Cuenta inexistente → 404 CUENTA_NO_ENCONTRADA */
export const getCuenta = (idCuenta: number) => getValidado(CUENTAS_ENDPOINTS.detalle(idCuenta), cuentaSchema)

/** CTA-04 · Cuenta inexistente → 404 CUENTA_NO_ENCONTRADA */
export const getSaldoCuenta = (idCuenta: number) =>
  getValidado(CUENTAS_ENDPOINTS.saldo(idCuenta), saldoCuentaSchema)
