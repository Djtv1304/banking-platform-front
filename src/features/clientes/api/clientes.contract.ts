import { z } from 'zod'

/*
 * Contrato de la consulta de clientes (C-03) en camelCase.
 *
 * - CLI-03 GET /clientes?q=…&identificacion=…&tipoCliente=…&estado=…&page=…&pageSize=…&sort=…
 *   Sin resultados responde 200 con `items: []` y `total: 0`. Un `sort` fuera de la lista
 *   blanca responde 400 SORT_INVALIDO.
 * - CLI-04 GET /clientes/{idCliente} → el cliente con sus direcciones activas.
 *   404 CLIENTE_NO_ENCONTRADO si no existe.
 *
 * Roles: ASESOR, CAJERO, SUPERVISOR y ADMIN (403 SIN_PERMISO para el resto).
 * Los esquemas solo describen los campos que usa la UI; zod descarta el resto.
 */

const BASE = '/api/v1/clientes'

export const CLIENTES_ENDPOINTS = {
  buscar: BASE,
  detalle: (idCliente: number) => `${BASE}/${idCliente}`,
} as const

export const TIPOS_CLIENTE = ['Natural', 'Juridico'] as const

/** Estados que acepta el filtro `estado` de CLI-03 */
export const ESTADOS_CLIENTE = [
  'Pendiente',
  'Activo',
  'Bloqueado',
  'Inactivo',
  'Cerrado',
  'Eliminado',
  'Suspendido',
] as const

/** Campos de `sort` que acepta CLI-03 (`campo,asc` o `campo,desc`) */
export const CAMPOS_ORDEN = [
  'idCliente',
  'identificacion',
  'tipoCliente',
  'nombres',
  'apellidos',
  'razonSocial',
  'estado',
  'fechaRegistro',
] as const

export const tipoClienteSchema = z.enum(TIPOS_CLIENTE)

/** CLI-03 · Lo que muestra cada fila del listado */
export const clienteResumenSchema = z.object({
  idCliente: z.number(),
  identificacion: z.string(),
  tipoCliente: tipoClienteSchema,
  nombres: z.string(),
  apellidos: z.string().nullish(),
  razonSocial: z.string().nullish(),
  /** El backend no lo restringe en la respuesta: se muestra tal cual */
  estado: z.string(),
})

/** CLI-04 · Solo llegan las direcciones activas */
export const direccionSchema = z.object({
  idDireccion: z.number(),
  tipoDireccion: z.string(),
  sector: z.string().nullish(),
  calleDireccion: z.string(),
  referenciaUbicacion: z.string(),
  esPrincipal: z.boolean(),
})

/** CLI-04 · Ficha del cliente */
export const clienteSchema = clienteResumenSchema.extend({
  tipoDocumento: z.enum(['C', 'R', 'P']),
  email: z.string(),
  telefonoCelular: z.string(),
  telefonoConvencional: z.string().nullish(),
  /** `YYYY-MM-DD` */
  fechaNacimiento: z.string(),
  fechaRegistro: z.string(),
  direcciones: z.array(direccionSchema),
})

export const paginaClientesSchema = z.object({
  items: z.array(clienteResumenSchema),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
})

/** Parámetros de CLI-03; los que no se envían no filtran */
export interface ParametrosBusqueda {
  q?: string
  identificacion?: string
  tipoCliente?: TipoCliente
  estado?: EstadoCliente
  page: number
  pageSize: number
  sort?: `${CampoOrden},${'asc' | 'desc'}`
}

export type TipoCliente = z.infer<typeof tipoClienteSchema>
export type EstadoCliente = (typeof ESTADOS_CLIENTE)[number]
export type CampoOrden = (typeof CAMPOS_ORDEN)[number]
export type ClienteResumen = z.infer<typeof clienteResumenSchema>
export type Cliente = z.infer<typeof clienteSchema>
export type Direccion = z.infer<typeof direccionSchema>
export type PaginaClientes = z.infer<typeof paginaClientesSchema>
