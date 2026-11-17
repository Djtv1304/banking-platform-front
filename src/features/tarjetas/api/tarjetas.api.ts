import { AxiosError, type AxiosResponse } from 'axios'
import type { z } from 'zod'

import { ApiError, apiClient, toApiError } from '@/shared/api'
import {
  clienteSchema,
  cuentaSchema,
  direccionSchema,
  pageHistorialSchema,
  pageSchema,
  TARJETAS_ENDPOINTS,
  tarjetaResumenSchema,
  tarjetaSchema,
  type TarjetaCreate,
  type TarjetaEstadoUpdate,
} from '@/features/tarjetas/api/tarjetas.contract'

const RESPUESTA_INVALIDA = 'No pudimos leer la respuesta del servidor. Inténtalo más tarde.'

function validar<T extends z.ZodType>(schema: T, data: unknown, status: number): z.infer<T> {
  const result = schema.safeParse(data)
  if (!result.success) throw new ApiError(RESPUESTA_INVALIDA, status, 'respuesta_invalida')
  return result.data
}

async function getValidado<T extends z.ZodType>(url: string, schema: T, params: Record<string, string>) {
  const { data, status } = await apiClient.get<unknown>(url, { params })
  return validar(schema, data, status)
}

/** CLI-03 · `null` si no hay un cliente con esa identificación */
export async function buscarClientePorIdentificacion(identificacion: string) {
  const page = await getValidado(TARJETAS_ENDPOINTS.clientes, pageSchema(clienteSchema), {
    identificacion,
    pageSize: '1',
  })
  return page.items[0] ?? null
}

/** CTA-02 · Todas las cuentas del cliente, en cualquier estado */
export async function getCuentasCliente(idCliente: number) {
  const page = await getValidado(TARJETAS_ENDPOINTS.cuentas, pageSchema(cuentaSchema), {
    idCliente: String(idCliente),
    pageSize: '100',
  })
  return page.items
}

/** CLI-09 · Solo las activas sirven para enviar la tarjeta */
export async function getDireccionesCliente(idCliente: number) {
  const direcciones = await getValidado(TARJETAS_ENDPOINTS.direcciones(idCliente), direccionSchema.array(), {})
  return direcciones.filter((direccion) => direccion.estado === 'Activo')
}

/** TAR-02 · Tarjetas principales de una cuenta: las únicas que pueden ser titulares de una extensión */
export async function getTarjetasPrincipalesCuenta(idCuenta: number) {
  const page = await getValidado(TARJETAS_ENDPOINTS.tarjetas, pageSchema(tarjetaResumenSchema), {
    idCuenta: String(idCuenta),
    esExtension: 'false',
    pageSize: '100',
  })
  return page.items
}

/** TAR-02 · `params` ya viene sin filtros vacíos (ver `armarParametros`): el backend rechaza lo que no conoce */
export const buscarTarjetas = (params: Record<string, string>) =>
  getValidado(TARJETAS_ENDPOINTS.tarjetas, pageSchema(tarjetaResumenSchema), params)

/** TAR-03 · Tarjeta inexistente → 404 TARJETA_NO_ENCONTRADA */
export const getTarjeta = (idTarjeta: number) => getValidado(TARJETAS_ENDPOINTS.tarjeta(idTarjeta), tarjetaSchema, {})

/** TAR-01 · Registra la solicitud; la tarjeta nace Solicitada y sin PIN */
export async function solicitarTarjeta(body: TarjetaCreate) {
  const { data, status } = await apiClient.post<unknown>(TARJETAS_ENDPOINTS.tarjetas, body)
  return validar(tarjetaSchema, data, status)
}

/** TAR-04 · Devuelve la tarjeta con su nuevo estado; el backend valida la transición */
export async function cambiarEstadoTarjeta(idTarjeta: number, body: TarjetaEstadoUpdate) {
  const { data, status } = await apiClient.post<unknown>(TARJETAS_ENDPOINTS.estado(idTarjeta), body)
  return validar(tarjetaSchema, data, status)
}

/** TAR-05 · Sin body (el backend rechaza uno): el HSM genera el PIN y nadie lo ve. Responde 204 */
export async function regenerarPin(idTarjeta: number) {
  await apiClient.post(TARJETAS_ENDPOINTS.pin(idTarjeta))
}

/** TAR-06 · `params` con page, pageSize y, si hay, fechaDesde/fechaHasta (YYYY-MM-DD) */
export const getHistorialTarjeta = (idTarjeta: number, params: Record<string, string>) =>
  getValidado(TARJETAS_ENDPOINTS.historial(idTarjeta), pageHistorialSchema, params)

/**
 * Con `responseType: 'blob'` el ProblemDetails de un error también llega como Blob y el
 * interceptor no podría leer su `code` (SOBRE_PIN_ENTREGADO…): se lee aquí y se normaliza igual.
 */
async function errorDesdeBlob(response: AxiosResponse<Blob>) {
  let data: unknown = null
  try {
    data = JSON.parse(await response.data.text())
  } catch {
    // Sin JSON: queda el error genérico del status
  }
  return toApiError(new AxiosError(undefined, undefined, response.config, response.request, { ...response, data }))
}

/**
 * TAR-07 · PDF del sobre de PIN; el backend lo entrega una sola vez. 401 y 403 siguen por el
 * interceptor (sesión vencida, releer el acceso); el resto de errores se leen del Blob.
 */
export async function descargarSobrePin(idTarjeta: number) {
  const response = await apiClient.get<Blob>(TARJETAS_ENDPOINTS.sobrePin(idTarjeta), {
    responseType: 'blob',
    validateStatus: (status) => status !== 401 && status !== 403,
  })
  if (response.status >= 300) throw await errorDesdeBlob(response)
  return response.data
}
