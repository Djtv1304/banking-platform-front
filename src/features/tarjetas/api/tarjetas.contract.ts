import { z } from 'zod'

/*
 * Contrato de la solicitud de tarjeta (A-04) en camelCase.
 *
 * - CLI-03 POST /clientes/busqueda `{ identificacion }` → buscar al cliente (identificación en el cuerpo)
 * - CTA-02 GET /cuentas?idCliente=…         → sus cuentas (solo una Activa admite tarjeta)
 * - CLI-09 GET /clientes/{id}/direcciones   → direcciones para el envío de la tarjeta
 * - TAR-02 GET /tarjetas?idCuenta=…&esExtension=false → principales (titular de una extensión)
 * - TAR-01 POST /tarjetas                   → registra la solicitud (estado Solicitada, sin PIN)
 * - TAR-02 GET /tarjetas                    → búsqueda por cliente, cuenta y estado (A-04)
 * - TAR-03 GET /tarjetas/{idTarjeta}        → detalle (A-04)
 * - TAR-04 POST /tarjetas/{id}/estado       → cambio de estado con motivo (A-05)
 * - TAR-05 POST /tarjetas/{id}/pin          → regenera el PIN en el HSM, 204 sin body (A-05)
 * - TAR-06 GET /tarjetas/{id}/historial     → eventos de estado y de PIN (A-05)
 * - TAR-07 GET /tarjetas/{id}/sobre-pin     → PDF del sobre de PIN, una sola vez (A-05)
 *
 * Los esquemas solo describen los campos que usa el front; zod descarta el resto.
 * ⚠️ TAR-01 y TAR-03 devuelven `tokenTarjeta`: no se declara en ningún esquema para que zod lo
 * descarte y nunca llegue a un estado, una caché ni la pantalla. Tampoco existe el PAN completo.
 */

const BASE = '/api/v1'

export const TARJETAS_ENDPOINTS = {
  clientes: `${BASE}/clientes/busqueda`,
  direcciones: (idCliente: number) => `${BASE}/clientes/${idCliente}/direcciones`,
  cuentas: `${BASE}/cuentas`,
  tarjetas: `${BASE}/tarjetas`,
  tarjeta: (idTarjeta: number) => `${BASE}/tarjetas/${idTarjeta}`,
  estado: (idTarjeta: number) => `${BASE}/tarjetas/${idTarjeta}/estado`,
  envio: (idTarjeta: number) => `${BASE}/tarjetas/${idTarjeta}/envio`,
  pin: (idTarjeta: number) => `${BASE}/tarjetas/${idTarjeta}/pin`,
  historial: (idTarjeta: number) => `${BASE}/tarjetas/${idTarjeta}/historial`,
  sobrePin: (idTarjeta: number) => `${BASE}/tarjetas/${idTarjeta}/sobre-pin`,
} as const

export const pageSchema = <T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item), total: z.number() })

/** CLI-03 · Solo los datos para identificar al cliente y prellenar el nombre impreso */
export const clienteSchema = z.object({
  idCliente: z.number(),
  identificacion: z.string(),
  tipoCliente: z.enum(['Natural', 'Juridico']),
  nombres: z.string(),
  apellidos: z.string().nullish(),
  razonSocial: z.string().nullish(),
  estado: z.string(),
})

/** CTA-02 */
export const cuentaSchema = z.object({
  idCuenta: z.number(),
  numeroCuenta: z.string(),
  idProducto: z.number(),
  idAgencia: z.string(),
  tipoCuenta: z.string(),
  estado: z.string(),
})

/** CLI-09 · Activas e inactivas; el país sale de la ciudad */
export const direccionSchema = z.object({
  idDireccion: z.number(),
  tipoDireccion: z.string(),
  idCiudad: z.number(),
  sector: z.string().nullish(),
  calleDireccion: z.string(),
  referenciaUbicacion: z.string(),
  esPrincipal: z.boolean(),
  estado: z.string(),
})

export const tipoTarjetaSchema = z.enum(['Debito', 'Credito'])

/** TAR-02 · Sin token ni PAN: solo el número enmascarado */
export const tarjetaResumenSchema = z.object({
  idTarjeta: z.number(),
  idCuenta: z.number(),
  tipoTarjeta: tipoTarjetaSchema,
  nombreTarjeta: z.string(),
  numeroEnmascarado: z.string(),
  estadoActual: z.string(),
  fechaEmision: z.string(),
  /** Extensión (adicional) y su tarjeta titular; las principales llevan false y null */
  esExtension: z.boolean(),
  idTarjetaTitular: z.number().nullable(),
})

/**
 * Estados de CK_Tarjeta_Estado en develop (para el filtro). `estadoActual` sigue siendo texto libre
 * porque main tiene otros estados: uno desconocido se muestra tal cual.
 */
export const ESTADOS_TARJETA = [
  'Solicitada',
  'Aprobada',
  'Generada',
  'Activa',
  'Inactiva',
  'Bloqueada',
  'Cancelada',
  'Anulada',
  'Vencida',
  'Cerrada',
] as const

export const envioTarjetaSchema = z.object({
  idTarjeta: z.number(),
  estadoEnvio: z.enum(['Pendiente', 'Despachado', 'Entregado', 'Cancelado']),
  codigoSeguimiento: z.string().nullable(),
  despachadoEn: z.string().nullable(),
})

/** TAR-01 y TAR-03 · Respuesta completa, sin `tokenTarjeta` */
export const tarjetaSchema = tarjetaResumenSchema.extend({
  idCliente: z.number(),
  idProducto: z.number(),
  pinAsignado: z.boolean(),
  fechaSolicitud: z.string().nullable(),
  fechaResolucion: z.string().nullable(),
  fechaExpiracion: z.string(),
  motivoEstado: z.string().nullish(),
  entregaVerificadaEn: z.string().nullish(),
  sobreDescargadoEn: z.string().nullish(),
  envio: envioTarjetaSchema.nullish(),
})

/** TAR-01 · Body `TarjetaCreate` */
export interface TarjetaCreate {
  idCuenta: number
  idProducto: number
  idSubProducto: number
  tipoTarjeta: TipoTarjeta
  nombreTarjeta: string
  esExtension: boolean
  idTarjetaTitular?: number
  requiereEnvio: boolean
  direccionEnvio?: string
  idCiudadEnvio?: number
}

export type Cliente = z.infer<typeof clienteSchema>
export type Cuenta = z.infer<typeof cuentaSchema>
export type Direccion = z.infer<typeof direccionSchema>
export type TipoTarjeta = z.infer<typeof tipoTarjetaSchema>
export type TarjetaResumen = z.infer<typeof tarjetaResumenSchema>
export type Tarjeta = z.infer<typeof tarjetaSchema>
export type EstadoTarjeta = (typeof ESTADOS_TARJETA)[number]

/** Estados en los que una tarjeta ya no sirve como titular de una extensión */
export const ESTADOS_TERMINALES = ['Cancelada', 'Anulada', 'Vencida', 'Cerrada'] as const

/** TAR-04 · Body `TarjetaEstadoUpdate`: el motivo queda en el historial (TAR-06) */
export interface TarjetaEstadoUpdate {
  estado: EstadoTarjeta
  motivo: string
  codigoMotivo?: string
  documentoVerificado?: boolean
}

/** TAR-06 · Quién fijó el PIN en un evento CambioPin */
export const origenPinSchema = z.enum(['Generacion', 'Regeneracion', 'Cliente'])

/**
 * TAR-06 · El backend omite los campos vacíos (`response_model_exclude_none`). `tipoEvento` es
 * texto libre (Bloqueo, Desbloqueo, Activacion, Anulacion, CambioEstado, CambioPin…).
 */
export const tarjetaHistorialSchema = z.object({
  idHistorial: z.number(),
  idTarjeta: z.number(),
  tipoEvento: z.string(),
  estadoAnterior: z.string().nullish(),
  estadoNuevo: z.string().nullish(),
  motivo: z.string().nullish(),
  resultado: z.string().nullish(),
  origen: origenPinSchema.nullish(),
  /** Fecha y hora con zona (ISO 8601) */
  fechaCambio: z.string(),
  realizadoPor: z.number(),
})

export const pageHistorialSchema = z.object({
  items: z.array(tarjetaHistorialSchema),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
})

export type OrigenPin = z.infer<typeof origenPinSchema>
export type TarjetaHistorial = z.infer<typeof tarjetaHistorialSchema>
