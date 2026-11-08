import type { z } from 'zod'

import { ApiError, apiClient } from '@/shared/api'
import {
  CLIENTES_ENDPOINTS,
  clienteSchema,
  paginaClientesSchema,
  type ParametrosBusqueda,
} from '@/features/clientes/api/clientes.contract'

const RESPUESTA_INVALIDA = 'No pudimos leer la respuesta del servidor. Inténtalo más tarde.'

/**
 * Un 200 no garantiza JSON (si `/api` no llega al backend, el hosting puede responder `index.html`):
 * si la forma no es la esperada se rechaza con un ApiError en vez de romper la pantalla.
 */
function validar<T extends z.ZodType>(schema: T, data: unknown, status: number): z.infer<T> {
  const result = schema.safeParse(data)
  if (!result.success) throw new ApiError(RESPUESTA_INVALIDA, status, 'respuesta_invalida')
  return result.data
}

/** CLI-03 · Una página de clientes con el total de resultados */
export async function buscarClientes(params: ParametrosBusqueda, signal?: AbortSignal) {
  const { data, status } = await apiClient.get<unknown>(CLIENTES_ENDPOINTS.buscar, { params, signal })
  return validar(paginaClientesSchema, data, status)
}

/** CLI-04 · Ficha con las direcciones activas; 404 CLIENTE_NO_ENCONTRADO si no existe */
export async function getCliente(idCliente: number, signal?: AbortSignal) {
  const { data, status } = await apiClient.get<unknown>(CLIENTES_ENDPOINTS.detalle(idCliente), { signal })
  return validar(clienteSchema, data, status)
}
