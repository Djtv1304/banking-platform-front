import { z } from 'zod'

/*
 * E3-05 · Cuentas contables de los productos (contract/contabilidad.json).
 * Cada rol de un tipo de producto se asigna una vez (al tipo, o al producto para el capital de
 * depósitos) y lo heredan sus productos y subproductos; el subproducto solo lleva una excepción.
 */

const BASE = '/api/v1/contabilidad/cuentas-producto'

export const CUENTAS_PRODUCTO_ENDPOINTS = {
  clases: `${BASE}/clases`,
  tipo: (idTipo: number) => `${BASE}/tipos/${idTipo}`,
  subproducto: (idSub: number) => `${BASE}/subproductos/${idSub}`,
} as const

export const claseSchema = z.object({
  idClase: z.number(),
  idTipoProducto: z.number(),
  codigoTipoProducto: z.string(),
  idTipoCredito: z.number().nullable(),
  codigoTipoCredito: z.string().nullable(),
  codigoRol: z.string(),
  nombreRol: z.string(),
  situacion: z.string().nullable(),
  condicion: z.string().nullable(),
  tramo: z.number().nullable(),
  cuentaBase: z.string(),
  nombreCuentaBase: z.string().nullable(),
  nivel: z.enum(['TIPO', 'PRODUCTO']),
  obligatorio: z.boolean(),
  soloConTasa: z.boolean(),
})
export type ClaseCuenta = z.infer<typeof claseSchema>

export const asignacionSchema = z.object({
  idCuentaProducto: z.number(),
  idClase: z.number(),
  idProducto: z.number().nullable(),
  codigoProducto: z.string().nullable(),
  idSubProducto: z.number().nullable(),
  codigoSubProducto: z.string().nullable(),
  idCuentaContable: z.number(),
  codigoCuenta: z.string(),
  nombreCuenta: z.string(),
  vigenciaDesde: z.string(),
  vigenciaHasta: z.string().nullable(),
  idSolicitud: z.number().nullable(),
})
export type AsignacionCuenta = z.infer<typeof asignacionSchema>

export const asignacionesTipoSchema = z.object({
  asignaciones: asignacionSchema.array(),
  productos: z
    .object({ idProducto: z.number(), codigoProducto: z.string(), nombreProducto: z.string(), idTipoCredito: z.number().nullable() })
    .array(),
  subproductos: z
    .object({ idSubProducto: z.number(), idProducto: z.number(), codigoSubProducto: z.string(), nombreSubProducto: z.string() })
    .array(),
  solicitudPendiente: z.number().nullable(),
})
export type AsignacionesTipo = z.infer<typeof asignacionesTipoSchema>

export const cuentasSubproductoSchema = z.object({
  idSubProducto: z.number(),
  codigoSubProducto: z.string(),
  idTipoProducto: z.number(),
  tipoTarjeta: z.string().nullable(),
  aviso: z.string().nullable(),
  faltantes: z.string().array(),
  roles: claseSchema
    .extend({
      requerido: z.boolean(),
      origen: z.enum(['TIPO', 'PRODUCTO', 'SUBPRODUCTO']).nullable(),
      cuenta: asignacionSchema.nullable(),
    })
    .array(),
})
export type CuentasSubproducto = z.infer<typeof cuentasSubproductoSchema>

/** PUT · una asignación nueva; idCuentaContable null termina una excepción de producto o subproducto */
export interface CambioAsignacion {
  idClase: number
  idProducto?: number | null
  idSubProducto?: number | null
  idCuentaContable: number | null
  vigenciaDesde: string
}

export const solicitudAceptadaSchema = z.object({ idSolicitud: z.number() })
