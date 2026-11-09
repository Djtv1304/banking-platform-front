import type { z } from 'zod'

import { ApiError, apiClient } from '@/shared/api'
import {
  clienteSchema,
  cuentaSchema,
  direccionSchema,
  pageSchema,
  TARJETAS_ENDPOINTS,
  tarjetaResumenSchema,
  tarjetaSchema,
  type TarjetaCreate,
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
