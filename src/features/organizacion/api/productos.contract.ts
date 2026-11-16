import { z } from 'zod'

/*
 * Contrato de Productos y subproductos (`/api/v1/productos`) en camelCase.
 *
 * ADMIN y ASESOR consultan; solo ADMIN crea y edita. Un producto nace inactivo y se activa cuando
 * tiene al menos un subproducto. No hay DELETE: la baja es lógica por estado. Los bodies rechazan
 * campos desconocidos (400): se envían solo los campos que se definen.
 */

export const PRODUCTOS_ENDPOINTS = {
  lista: '/api/v1/productos',
  producto: (idProducto: number) => `/api/v1/productos/${idProducto}`,
  subproductos: (idProducto: number) => `/api/v1/productos/${idProducto}/subproductos`,
  subproducto: (idSubProducto: number) => `/api/v1/productos/subproductos/${idSubProducto}`,
  cupos: (idSubProducto: number) => `/api/v1/productos/subproductos/${idSubProducto}/cupos`,
  vinculosProducto: (idProducto: number) => `/api/v1/productos/${idProducto}/vinculos`,
  ficha: (idSubProducto: number) => `/api/v1/productos/subproductos/${idSubProducto}/ficha`,
  vinculosSubProducto: (idSubProducto: number) => `/api/v1/productos/subproductos/${idSubProducto}/vinculos`,
  restricciones: (idSubProducto: number) => `/api/v1/productos/subproductos/${idSubProducto}/restricciones`,
} as const

export const PRODUCTOS_ROLES = {
  consultar: ['ADMIN', 'ASESOR'],
  administrar: ['ADMIN'],
} as const

export const tipoProductoSchema = z.enum(['Cuenta', 'Credito', 'Tarjeta'])
export const estadoProductoSchema = z.enum(['A', 'I'])
export const tipoCuentaSchema = z.enum(['Ahorro', 'Corriente'])

export const subProductoAdminSchema = z.object({
  idSubProducto: z.number(),
  idProducto: z.number(),
  codigoSubProducto: z.string(),
  nombreSubProducto: z.string(),
  estado: estadoProductoSchema,
  fechaRegistro: z.string(),
  /** Solo en subproductos de tarjeta: lo define el prefijo del código (TDB débito, TCR crédito) */
  tipoTarjeta: z.enum(['Debito', 'Credito']).nullish(),
  /** Elegibilidad por edad; null = sin límite (menores: edadMaxima 17) */
  edadMinima: z.number().nullish(),
  edadMaxima: z.number().nullish(),
})

export const productoAdminSchema = z.object({
  idProducto: z.number(),
  codigoProducto: z.string(),
  nombreProducto: z.string(),
  descripcion: z.string().nullish(),
  tipoProducto: tipoProductoSchema,
  tipoCuenta: tipoCuentaSchema.nullish(),
  montoAperturaMinimo: z.number().nullish(),
  idTipoCredito: z.number().nullish(),
  nombreTipoCredito: z.string().nullish(),
  idRed: z.number().nullish(),
  nombreRed: z.string().nullish(),
  permiteOperacionesPresenciales: z.boolean(),
  estado: estadoProductoSchema,
  subproductos: z.array(subProductoAdminSchema),
})

export type TipoProductoAdmin = z.infer<typeof tipoProductoSchema>
export type EstadoProducto = z.infer<typeof estadoProductoSchema>
export type TipoCuenta = z.infer<typeof tipoCuentaSchema>
export type ProductoAdmin = z.infer<typeof productoAdminSchema>
export type SubProductoAdmin = z.infer<typeof subProductoAdminSchema>

/** POST · Cuenta pide tipoCuenta (y monto); Credito pide idTipoCredito; Tarjeta pide idRed */
export interface ProductoCreate {
  codigoProducto: string
  nombreProducto: string
  descripcion?: string
  tipoProducto: TipoProductoAdmin
  tipoCuenta?: TipoCuenta
  montoAperturaMinimo?: number
  idTipoCredito?: number
  idRed?: number
  permiteOperacionesPresenciales: boolean
}

/** PATCH · Parcial. El tipo no cambia; el código solo en un producto inactivo y sin uso. `descripcion: null` la borra */
export interface ProductoUpdate {
  codigoProducto?: string
  nombreProducto?: string
  descripcion?: string | null
  montoAperturaMinimo?: number
  permiteOperacionesPresenciales?: boolean
  estado?: EstadoProducto
}

export interface SubProductoCreate {
  codigoSubProducto: string
  nombreSubProducto: string
  edadMinima?: number
  edadMaxima?: number
}

export interface SubProductoUpdate {
  nombreSubProducto?: string
  estado?: EstadoProducto
  /** null quita el límite */
  edadMinima?: number | null
  edadMaxima?: number | null
}

/** Cuentas y tarjetas: máximos por canal. Los cupos que personaliza el cliente no los superan */
export const cupoCanalSchema = z.object({
  idCanal: z.number(),
  codigoCanal: z.string(),
  nombreCanal: z.string(),
  habilitado: z.boolean(),
  cupoDiarioMaximo: z.number().nullish(),
  cupoMensualMaximo: z.number().nullish(),
  montoMaxTransaccion: z.number().nullish(),
  maxTransaccionesDia: z.number().nullish(),
})

export type CupoCanal = z.infer<typeof cupoCanalSchema>

/** PUT (solo ADMIN) · Los canales que no vienen se quitan */
export interface CupoCanalBody {
  idCanal: number
  cupoDiarioMaximo: number
  cupoMensualMaximo: number
  montoMaxTransaccion: number
  maxTransaccionesDia: number
}

/** Cuentas: null = sin esa restricción */
export const restriccionesSchema = z.object({
  diasSinRetiros: z.number().nullish(),
  saldoMinimo: z.number().nullish(),
})

export type Restricciones = z.infer<typeof restriccionesSchema>

export interface RestriccionesBody {
  diasSinRetiros: number | null
  saldoMinimo: number | null
}

/*
 * Vínculos uno a varios con tasas, comisiones, seguros y sistemas de amortización. Lo del producto
 * aplica a todos sus subproductos; lo del subproducto lo personaliza (una comisión con
 * `exonerado` no se cobra en ese subproducto). Por ahora solo se guarda el checklist.
 */
const vinculosBaseSchema = z.object({
  tasasInteres: z.array(z.number()),
  comisiones: z.array(z.object({ idComision: z.number(), exonerado: z.boolean() })),
  seguros: z.array(z.object({ idSeguro: z.number(), esObligatorio: z.boolean() })),
  sistemasAmortizacion: z.array(z.string()),
})

export const vinculosSchema = vinculosBaseSchema.extend({
  /** Solo en subproductos: lo que heredan del producto */
  delProducto: vinculosBaseSchema.nullish(),
})

export type Vinculos = z.infer<typeof vinculosBaseSchema>
export type VinculosVista = z.infer<typeof vinculosSchema>
export type DestinoVinculos = { tipo: 'producto'; id: number } | { tipo: 'subproducto'; id: number }

/** Lo que el asesor lee al cliente: lo vigente del subproducto con lo que hereda del producto */
export const fichaSubProductoSchema = z.object({
  producto: productoAdminSchema,
  subproducto: subProductoAdminSchema,
  cupos: z.array(cupoCanalSchema),
  restricciones: restriccionesSchema.nullish(),
  tasas: z.array(
    z.object({
      idTasaInteres: z.number(),
      tipoTasa: z.string(),
      tasaNominalAnual: z.number(),
      montoMinimo: z.number().nullish(),
      montoMaximo: z.number().nullish(),
      plazoMaximoMeses: z.number().nullish(),
      vigente: z.boolean(),
      delProducto: z.boolean(),
    }),
  ),
  comisiones: z.array(
    z.object({
      idComision: z.number(),
      codigoComision: z.string(),
      descripcion: z.string(),
      tipoCalculo: z.string(),
      valor: z.number(),
      nombreCanal: z.string(),
      delProducto: z.boolean(),
    }),
  ),
  seguros: z.array(
    z.object({
      idSeguro: z.number(),
      nombre: z.string(),
      tipoCalculo: z.string(),
      valor: z.number(),
      esObligatorio: z.boolean(),
      delProducto: z.boolean(),
    }),
  ),
  sistemasAmortizacion: z.array(z.string()),
})

export type FichaSubProducto = z.infer<typeof fichaSubProductoSchema>
