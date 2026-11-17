import { z } from 'zod'

/* Productos y subproductos: tipos del catalogo E3-01, altas en Borrador,
 * datos editables solo en Borrador sin uso y eliminacion del producto nunca activado.
 * WorkOS exige los permisos PRD-CONSULTAR, PRD-EDITAR y PRD-EXPORTAR segun la accion.
 * Estado A/I se conserva por compatibilidad; estadoCatalogo expresa el ciclo de vida.
 */

export const PRODUCTOS_ENDPOINTS = {
  lista: '/api/v1/productos',
  tipos: '/api/v1/productos/tipos',
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
export const estadoCatalogoSchema = z.enum(['Borrador', 'Activo', 'Suspendido', 'Retirado'])
export const tipoClientePermitidoSchema = z.enum(['Natural', 'Juridico', 'Ambos'])
export const tipoProductoInfoSchema = z.object({ idTipoProducto: z.number(), codigo: z.string(), nombre: z.string(), tipoProducto: tipoProductoSchema, tipoCuenta: z.enum(['Ahorro', 'Corriente']).nullish() })
export const tipoCuentaSchema = z.enum(['Ahorro', 'Corriente'])

export const subProductoAdminSchema = z.object({
  idSubProducto: z.number(),
  idProducto: z.number(),
  codigoSubProducto: z.string(),
  nombreSubProducto: z.string(),
  estado: estadoProductoSchema,
  estadoCatalogo: estadoCatalogoSchema.nullish(),
  fechaRegistro: z.string(),
  /** Solo en subproductos de tarjeta: lo define el prefijo del código (TDB débito, TCR crédito) */
  tipoTarjeta: z.enum(['Debito', 'Credito']).nullish(),
  /** Elegibilidad por edad; null = sin límite (menores: edadMaxima 17) */
  edadMinima: z.number().nullish(),
  edadMaxima: z.number().nullish(),
  tipoClientePermitido: tipoClientePermitidoSchema.optional(),
  requiereTutor: z.boolean().optional(),
  idSubProductoRequerido: z.number().nullish(),
  maximoPorCliente: z.number().nullish(),
})

export const productoAdminSchema = z.object({
  idProducto: z.number(),
  codigoProducto: z.string(),
  nombreProducto: z.string(),
  descripcion: z.string().nullish(),
  tipoProducto: tipoProductoSchema,
  idTipoProducto: z.number().nullish(),
  tipoCuenta: tipoCuentaSchema.nullish(),
  montoAperturaMinimo: z.number().nullish(),
  idTipoCredito: z.number().nullish(),
  nombreTipoCredito: z.string().nullish(),
  idRed: z.number().nullish(),
  nombreRed: z.string().nullish(),
  permiteOperacionesPresenciales: z.boolean(),
  estado: estadoProductoSchema,
  estadoCatalogo: estadoCatalogoSchema.nullish(),
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
  idTipoProducto?: number
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
  estadoCatalogo?: z.infer<typeof estadoCatalogoSchema>
  estado?: EstadoProducto
}

export interface SubProductoCreate {
  codigoSubProducto: string
  nombreSubProducto: string
  edadMinima?: number
  tipoClientePermitido?: z.infer<typeof tipoClientePermitidoSchema>
  requiereTutor?: boolean
  idSubProductoRequerido?: number | null
  maximoPorCliente?: number | null
  edadMaxima?: number
}

export interface SubProductoUpdate {
  nombreSubProducto?: string
  estadoCatalogo?: z.infer<typeof estadoCatalogoSchema>
  estado?: EstadoProducto
  /** null quita el límite */
  edadMinima?: number | null
  tipoClientePermitido?: z.infer<typeof tipoClientePermitidoSchema>
  requiereTutor?: boolean
  idSubProductoRequerido?: number | null
  maximoPorCliente?: number | null
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
  fecha: z.string().optional(),
  condiciones: z.object({ montoAperturaMinimo: z.number(), saldoMinimo: z.number(), tasaInteresAnual: z.number(), costoMantenimiento: z.number(), periodicidadInteres: z.string().nullish(), periodicidadCosto: z.string().nullish(), mesesInactividad: z.number().nullish(), vigenciaDesde: z.string(), vigenciaHasta: z.string().nullish() }).nullish(),
  producto: productoAdminSchema,
  subproducto: subProductoAdminSchema,
  /** Edad que rige: la mínima más alta entre subproducto, red (tarjetas) y política EDAD_MINIMA (créditos) */
  elegibilidad: z.object({
    edadMinima: z.number().nullish(),
    edadMaxima: z.number().nullish(),
    tipoClientePermitido: tipoClientePermitidoSchema.optional(),
    requiereTutor: z.boolean().optional(),
    idSubProductoRequerido: z.number().nullish(),
    maximoPorCliente: z.number().nullish(),
    edadMinimaSubproducto: z.number().nullish(),
    edadMinimaRed: z.number().nullish(),
    edadMinimaPolitica: z.number().nullish(),
  }),
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
