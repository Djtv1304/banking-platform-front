import type { z } from 'zod'

import { ApiError, apiClient } from '@/shared/api'
import { descargarCsv } from '@/shared/lib'
import {
  busquedaClientesSchema,
  CLIENTES_ENDPOINTS,
  clienteSchema,
  FILTRO_REQUERIDO,
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

/** Valida el cuerpo antes de enviarlo: sin filtro no se consulta (el backend respondería 400 FILTRO_REQUERIDO) */
function cuerpoBusqueda(params: ParametrosBusqueda) {
  const result = busquedaClientesSchema.safeParse(params)
  if (result.success) return result.data
  const issue = result.error.issues[0]
  const sinFiltro = issue?.message === FILTRO_REQUERIDO
  throw new ApiError(issue?.message ?? FILTRO_REQUERIDO, null, sinFiltro ? 'FILTRO_REQUERIDO' : 'DATOS_INVALIDOS')
}

/** CLI-03 · Una página de clientes con el total de resultados; los filtros van en el cuerpo, nunca en la URL */
export async function buscarClientes(params: ParametrosBusqueda, signal?: AbortSignal) {
  const { data, status } = await apiClient.post<unknown>(CLIENTES_ENDPOINTS.buscar, cuerpoBusqueda(params), { signal })
  return validar(paginaClientesSchema, data, status)
}

/** E5-05 · Descarga `clientes.csv` (ya enmascarado por el backend) con los mismos filtros de la búsqueda */
export async function exportarClientes(params: ParametrosBusqueda) {
  const { data, status, headers } = await apiClient.post<unknown>(CLIENTES_ENDPOINTS.exportar, cuerpoBusqueda(params), {
    responseType: 'text',
  })
  if (typeof data !== 'string' || !String(headers['content-type'] ?? '').startsWith('text/csv')) {
    throw new ApiError('El servidor no devolvió un archivo CSV.', status, 'respuesta_invalida')
  }
  // `descargarCsv` antepone el BOM: se quita si el backend ya lo envía para no duplicarlo
  descargarCsv('clientes.csv', data.replace(/^\uFEFF/, ''))
}

/** CLI-04 · Ficha con las direcciones activas; 404 CLIENTE_NO_ENCONTRADO si no existe */
export async function getCliente(idCliente: number, signal?: AbortSignal) {
  const { data, status } = await apiClient.get<unknown>(CLIENTES_ENDPOINTS.detalle(idCliente), { signal })
  return validar(clienteSchema, data, status)
}
