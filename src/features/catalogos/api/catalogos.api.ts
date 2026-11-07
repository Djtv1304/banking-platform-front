import type { z } from 'zod'

import { ApiError, apiClient } from '@/shared/api'
import {
  CATALOGOS_ENDPOINTS,
  actividadEconomicaSchema,
  agenciaSchema,
  canalSchema,
  ciudadSchema,
  denominacionSchema,
  paisSchema,
  productoSchema,
  tipoAntecedenteSchema,
  tipoCreditoSchema,
  tipoMovimientoCajaSchema,
  type TipoProducto,
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

/** Sin `tipo` devuelve todos los productos activos */
export const getProductos = (tipo?: TipoProducto) =>
  getLista(CATALOGOS_ENDPOINTS.productos, productoSchema, tipo ? { tipo } : undefined)

export const getCanales = () => getLista(CATALOGOS_ENDPOINTS.canales, canalSchema)

export const getTiposCredito = () => getLista(CATALOGOS_ENDPOINTS.tiposCredito, tipoCreditoSchema)

export const getTiposMovimientoCaja = () =>
  getLista(CATALOGOS_ENDPOINTS.tiposMovimientoCaja, tipoMovimientoCajaSchema)
