import type { z } from 'zod'

import { ApiError, apiClient } from '@/shared/api'
import {
  PRODUCTOS_ENDPOINTS,
  productoAdminSchema,
  cupoCanalSchema,
  fichaSubProductoSchema,
  restriccionesSchema,
  subProductoAdminSchema,
  vinculosSchema,
  type CupoCanalBody,
  type DestinoVinculos,
  type ProductoCreate,
  type ProductoUpdate,
  type RestriccionesBody,
  type SubProductoCreate,
  type SubProductoUpdate,
  type Vinculos,
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

const urlVinculos = (d: DestinoVinculos) =>
  d.tipo === 'producto' ? PRODUCTOS_ENDPOINTS.vinculosProducto(d.id) : PRODUCTOS_ENDPOINTS.vinculosSubProducto(d.id)

export async function obtenerVinculos(destino: DestinoVinculos) {
  const { data, status } = await apiClient.get<unknown>(urlVinculos(destino))
  return validar(vinculosSchema, data, status)
}

/** PUT (solo ADMIN): el checklist completo; lo que no va queda desmarcado */
export async function guardarVinculos(destino: DestinoVinculos, body: Vinculos) {
  const { data, status } = await apiClient.put<unknown>(urlVinculos(destino), body)
  return validar(vinculosSchema, data, status)
}

/** 204; solo un producto inactivo y sin uso (409 PRODUCTO_EN_USO / PRODUCTO_ACTIVO) */
export async function eliminarProducto(idProducto: number) {
  await apiClient.delete(PRODUCTOS_ENDPOINTS.producto(idProducto))
}

export async function obtenerFicha(idSubProducto: number) {
  const { data, status } = await apiClient.get<unknown>(PRODUCTOS_ENDPOINTS.ficha(idSubProducto))
  return validar(fichaSubProductoSchema, data, status)
}
