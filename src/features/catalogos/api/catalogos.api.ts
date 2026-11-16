import type { z } from 'zod'

import { ApiError, apiClient } from '@/shared/api'
import {
  CATALOGOS_ENDPOINTS,
  actividadEconomicaSchema,
  agenciaSchema,
  canalSchema,
  comisionSchema,
  catalogoAdministrableSchema,
  ciudadSchema,
  denominacionSchema,
  paisSchema,
  productoSchema,
  redSchema,
  registroCatalogoSchema,
  seguroSchema,
  sistemaAmortizacionSchema,
  tasaInteresSchema,
  tipoAntecedenteSchema,
  tipoCreditoSchema,
  tipoMovimientoCajaSchema,
  type TasaInteresCreate,
  type ValorCampo,
  type TipoProducto,
  type TipoTarjeta,
} from '@/features/catalogos/api/catalogos.contract'

/**
 * GET de una lista y validación de su forma. Si la respuesta no es la esperada (p. ej. HTML porque
 * el backend no está conectado) se rechaza con un ApiError en vez de romper el formulario.
 */
async function getLista<T extends z.ZodType>(url: string, schema: T, params?: Record<string, string>) {
  const { data, status } = await apiClient.get<unknown>(url, { params })
  const result = schema.array().safeParse(data)
  if (!result.success) {
    throw new ApiError('No pudimos cargar el catálogo. Inténtalo más tarde.', status, 'respuesta_invalida')
  }
  return result.data as z.infer<T>[]
}

export const getPaises = () => getLista(CATALOGOS_ENDPOINTS.paises, paisSchema)

export const getCiudades = (codigoPais: string) => getLista(CATALOGOS_ENDPOINTS.ciudades(codigoPais), ciudadSchema)

export const getActividadesEconomicas = () =>
  getLista(CATALOGOS_ENDPOINTS.actividadesEconomicas, actividadEconomicaSchema)

export const getTiposAntecedente = () => getLista(CATALOGOS_ENDPOINTS.tiposAntecedente, tipoAntecedenteSchema)

export const getDenominaciones = () => getLista(CATALOGOS_ENDPOINTS.denominaciones, denominacionSchema)

export const getAgencias = () => getLista(CATALOGOS_ENDPOINTS.agencias, agenciaSchema)

/**
 * Sin filtros devuelve todos los productos activos con sus subproductos. `tipoTarjeta` deja solo
 * productos Tarjeta con los subproductos de ese tipo (emisión de tarjetas, TAR-01).
 */
export const getProductos = (tipo?: TipoProducto, tipoTarjeta?: TipoTarjeta) => {
  const params: Record<string, string> = {}
  if (tipo) params.tipo = tipo
  if (tipoTarjeta) params.tipoTarjeta = tipoTarjeta
  return getLista(CATALOGOS_ENDPOINTS.productos, productoSchema, params)
}

export const getRedes = () => getLista(CATALOGOS_ENDPOINTS.redes, redSchema)

export const getCanales = () => getLista(CATALOGOS_ENDPOINTS.canales, canalSchema)

export const getTiposCredito = () => getLista(CATALOGOS_ENDPOINTS.tiposCredito, tipoCreditoSchema)

export const getTiposMovimientoCaja = () =>
  getLista(CATALOGOS_ENDPOINTS.tiposMovimientoCaja, tipoMovimientoCajaSchema)

export const getSistemasAmortizacion = () =>
  getLista(CATALOGOS_ENDPOINTS.sistemasAmortizacion, sistemaAmortizacionSchema)

/** Todas las tasas, o solo las de un tipo de crédito */
export const getTasasInteres = (idTipoCredito?: number) =>
  getLista(
    CATALOGOS_ENDPOINTS.tasasInteres,
    tasaInteresSchema,
    idTipoCredito ? { idTipoCredito: String(idTipoCredito) } : undefined,
  )

/** 201 con la tasa creada (solo ADMIN) */
export async function crearTasaInteres(body: TasaInteresCreate) {
  const { data, status } = await apiClient.post<unknown>(CATALOGOS_ENDPOINTS.tasasInteres, body)
  const result = tasaInteresSchema.safeParse(data)
  if (!result.success) {
    throw new ApiError('No pudimos leer la respuesta del servidor. Inténtalo más tarde.', status, 'respuesta_invalida')
  }
  return result.data
}

export const getCatalogosAdministrables = () =>
  getLista(CATALOGOS_ENDPOINTS.administracion, catalogoAdministrableSchema)

/** Todas las filas, activas e inactivas */
export const getRegistrosCatalogo = (clave: string) => getLista(CATALOGOS_ENDPOINTS.registros(clave), registroCatalogoSchema)

/** PATCH (solo ADMIN): solo los campos que cambian, o `estado` */
export async function actualizarRegistroCatalogo(clave: string, id: string, body: Record<string, ValorCampo>) {
  const { data, status } = await apiClient.patch<unknown>(CATALOGOS_ENDPOINTS.registro(clave, id), body)
  const result = registroCatalogoSchema.safeParse(data)
  if (!result.success) {
    throw new ApiError('No pudimos leer la respuesta del servidor. Inténtalo más tarde.', status, 'respuesta_invalida')
  }
  return result.data
}

export const getComisiones = () => getLista(CATALOGOS_ENDPOINTS.comisiones, comisionSchema)

export const getSeguros = () => getLista(CATALOGOS_ENDPOINTS.seguros, seguroSchema)

/** POST (solo ADMIN): 201 con la fila creada */
export async function crearRegistroCatalogo(clave: string, body: Record<string, ValorCampo>) {
  const { data, status } = await apiClient.post<unknown>(CATALOGOS_ENDPOINTS.registros(clave), body)
  const result = registroCatalogoSchema.safeParse(data)
  if (!result.success) {
    throw new ApiError('No pudimos leer la respuesta del servidor. Inténtalo más tarde.', status, 'respuesta_invalida')
  }
  return result.data
}

/** DELETE (solo ADMIN): 204; si alguien lo usa, 409 ITEM_EN_USO */
export async function eliminarRegistroCatalogo(clave: string, id: string) {
  await apiClient.delete(CATALOGOS_ENDPOINTS.registro(clave, id))
}
