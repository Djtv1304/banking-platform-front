import type { z } from 'zod'

import { ApiError, apiClient } from '@/shared/api'
import {
  PRODUCTOS_ENDPOINTS,
  productoAdminSchema,
  cupoCanalSchema,
  restriccionesSchema,
  subProductoAdminSchema,
  subProductoParametrosSchema,
  type CupoCanalBody,
  type ProductoCreate,
  type ProductoUpdate,
  type RestriccionesBody,
  type SubProductoCreate,
  type SubProductoParametrosBody,
  type SubProductoUpdate,
} from '@/features/organizacion/api/productos.contract'

const RESPUESTA_INVALIDA = 'No pudimos leer la respuesta del servidor. Inténtalo más tarde.'

/** Si la forma no es la esperada (p. ej. HTML sin backend) se rechaza en vez de dar por hecho el cambio */
function validar<T extends z.ZodType>(schema: T, data: unknown, status: number): z.infer<T> {
  const result = schema.safeParse(data)
  if (!result.success) throw new ApiError(RESPUESTA_INVALIDA, status, 'respuesta_invalida')
  return result.data
}

/** Todos los productos (activos e inactivos) con todos sus subproductos */
export async function listarProductos() {
  const { data, status } = await apiClient.get<unknown>(PRODUCTOS_ENDPOINTS.lista)
  return validar(productoAdminSchema.array(), data, status)
}

export async function obtenerProducto(idProducto: number) {
  const { data, status } = await apiClient.get<unknown>(PRODUCTOS_ENDPOINTS.producto(idProducto))
  return validar(productoAdminSchema, data, status)
}

/** 201 con el producto creado, inactivo y sin subproductos */
export async function crearProducto(body: ProductoCreate) {
  const { data, status } = await apiClient.post<unknown>(PRODUCTOS_ENDPOINTS.lista, body)
  return validar(productoAdminSchema, data, status)
}

export async function actualizarProducto(idProducto: number, body: ProductoUpdate) {
  const { data, status } = await apiClient.patch<unknown>(PRODUCTOS_ENDPOINTS.producto(idProducto), body)
  return validar(productoAdminSchema, data, status)
}

/** 201 con el subproducto creado, activo */
export async function crearSubProducto(idProducto: number, body: SubProductoCreate) {
  const { data, status } = await apiClient.post<unknown>(PRODUCTOS_ENDPOINTS.subproductos(idProducto), body)
  return validar(subProductoAdminSchema, data, status)
}

export async function actualizarSubProducto(idSubProducto: number, body: SubProductoUpdate) {
  const { data, status } = await apiClient.patch<unknown>(PRODUCTOS_ENDPOINTS.subproducto(idSubProducto), body)
  return validar(subProductoAdminSchema, data, status)
}

export async function obtenerParametros(idSubProducto: number) {
  const { data, status } = await apiClient.get<unknown>(PRODUCTOS_ENDPOINTS.parametros(idSubProducto))
  return validar(subProductoParametrosSchema, data, status)
}

export async function guardarParametros(idSubProducto: number, body: SubProductoParametrosBody) {
  const { data, status } = await apiClient.put<unknown>(PRODUCTOS_ENDPOINTS.parametros(idSubProducto), body)
  return validar(subProductoParametrosSchema, data, status)
}

export async function obtenerCupos(idSubProducto: number) {
  const { data, status } = await apiClient.get<unknown>(PRODUCTOS_ENDPOINTS.cupos(idSubProducto))
  return validar(cupoCanalSchema.array(), data, status)
}

export async function guardarCupos(idSubProducto: number, cupos: CupoCanalBody[]) {
  const { data, status } = await apiClient.put<unknown>(PRODUCTOS_ENDPOINTS.cupos(idSubProducto), { cupos })
  return validar(cupoCanalSchema.array(), data, status)
}

export async function obtenerRestricciones(idSubProducto: number) {
  const { data, status } = await apiClient.get<unknown>(PRODUCTOS_ENDPOINTS.restricciones(idSubProducto))
  return validar(restriccionesSchema, data, status)
}

export async function guardarRestricciones(idSubProducto: number, body: RestriccionesBody) {
  const { data, status } = await apiClient.put<unknown>(PRODUCTOS_ENDPOINTS.restricciones(idSubProducto), body)
  return validar(restriccionesSchema, data, status)
}
