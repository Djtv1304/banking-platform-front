import type { z } from 'zod'

import { ApiError, apiClient } from '@/shared/api'
import {
  PRODUCTOS_ENDPOINTS,
  productoAdminSchema,
  subProductoAdminSchema,
  type ProductoCreate,
  type ProductoUpdate,
  type SubProductoCreate,
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
