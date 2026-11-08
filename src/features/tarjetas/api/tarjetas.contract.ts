import { z } from 'zod'

/*
 * Contrato de la solicitud de tarjeta (A-04) en camelCase.
 *
 * - CLI-03 GET /clientes?identificacion=…  → buscar al cliente
 * - CTA-02 GET /cuentas?idCliente=…         → sus cuentas (solo una Activa admite tarjeta)
 * - CLI-09 GET /clientes/{id}/direcciones   → direcciones para el envío de la tarjeta
 * - TAR-02 GET /tarjetas?idCuenta=…&esExtension=false → principales (titular de una extensión)
 * - TAR-01 POST /tarjetas                   → registra la solicitud (estado Solicitada, sin PIN)
 *
 * Los esquemas solo describen los campos que usa el formulario; zod descarta el resto.
 */

const BASE = '/api/v1'

export const TARJETAS_ENDPOINTS = {
  clientes: `${BASE}/clientes`,
  direcciones: (idCliente: number) => `${BASE}/clientes/${idCliente}/direcciones`,
  cuentas: `${BASE}/cuentas`,
  tarjetas: `${BASE}/tarjetas`,
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

/** TAR-01 · Respuesta 201 */
export const tarjetaSchema = tarjetaResumenSchema.extend({
  idCliente: z.number(),
  idProducto: z.number(),
  pinAsignado: z.boolean(),
  fechaSolicitud: z.string().nullable(),
  fechaResolucion: z.string().nullable(),
  fechaExpiracion: z.string(),
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

/** Estados en los que una tarjeta ya no sirve como titular de una extensión */
export const ESTADOS_TERMINALES = ['Cancelada', 'Anulada', 'Vencida', 'Cerrada'] as const
