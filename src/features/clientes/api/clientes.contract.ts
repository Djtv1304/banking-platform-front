import { z } from 'zod'

/*
 * Contrato de la consulta de clientes (C-03 / E5-05) en camelCase.
 *
 * - CLI-03 POST /clientes/busqueda con los filtros en el cuerpo (nunca en la URL: ASVS 14.2.1).
 *   Exige al menos un filtro (400 FILTRO_REQUERIDO); sin resultados responde 200 con `items: []`.
 * - POST /clientes/busqueda/exportacion → el mismo cuerpo, responde `text/csv` ya enmascarado.
 * - CLI-04 GET /clientes/{idCliente} → el cliente con sus direcciones activas (al CAJERO, `[]`).
 *   404 CLIENTE_NO_ENCONTRADO si no existe.
 *
 * Identificación, correo y teléfonos llegan SIEMPRE enmascarados (`******4065`); el valor completo
 * solo se obtiene con la revelación auditada (ver `revelacion.ts`).
 * Roles: ASESOR, CAJERO, SUPERVISOR y ADMIN (403 SIN_PERMISO para el resto).
 * Los esquemas solo describen los campos que usa la UI; zod descarta el resto.
 */

const BASE = '/api/v1/clientes'

export const CLIENTES_ENDPOINTS = {
  /** CLI-01 · POST para registrar */
  registrar: BASE,
  reincorporar: `${BASE}/reincorporaciones`,
  buscar: `${BASE}/busqueda`,
  exportar: `${BASE}/busqueda/exportacion`,
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
  /** Código de 3 dígitos de la agencia donde se registró; null en el legado */
  idAgenciaRegistro: z.string().nullish(),
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
  tipoDocumento: z.string().min(1).max(10),
  email: z.string(),
  telefonoCelular: z.string(),
  telefonoConvencional: z.string().nullish(),
  nombreComercial: z.string().nullable(),
  estadoCivil: z.string().nullable(),
  idActividadEconomica: z.number().nullable(),
  /** `YYYY-MM-DD` */
  fechaNacimiento: z.string(),
  fechaRegistro: z.string(),
  direcciones: z.array(direccionSchema),
  /** E5-04 · marca manual del personal; se borra al aprobarse un cambio de correo */
  emailVerificado: z.boolean().default(false),
  /** E5-07 · motivo del último cambio de estado */
  motivoEstado: z.string().nullable().optional(),
})

export const paginaClientesSchema = z.object({
  items: z.array(clienteResumenSchema),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
})

export const FILTRO_REQUERIDO = 'Indica al menos un filtro: documento, nombre, correo, estado o agencia de registro.'

/** Filtros que bastan por sí solos; `tipoCliente` solo acota */
const FILTROS_SUFICIENTES = ['identificacion', 'nombre', 'email', 'estado', 'idAgenciaRegistro'] as const

/** Cuerpo de CLI-03 (y de la exportación); los que no se envían no filtran */
export const busquedaClientesSchema = z.strictObject({
  identificacion: z.string().trim().min(1).max(13).optional(),
  nombre: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres.').max(100).optional(),
  email: z.string().trim().max(150).pipe(z.email('Escribe el correo completo: la búsqueda por correo es exacta.')).optional(),
  estado: z.enum(ESTADOS_CLIENTE).optional(),
  idAgenciaRegistro: z.string().regex(/^\d{3}$/, 'La agencia de registro tiene 3 dígitos.').optional(),
  tipoCliente: tipoClienteSchema.optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
  sort: z.custom<`${CampoOrden},${'asc' | 'desc'}`>((valor) =>
    typeof valor === 'string' && new RegExp(`^(${CAMPOS_ORDEN.join('|')}),(asc|desc)$`).test(valor)).optional(),
}).refine((filtros) => FILTROS_SUFICIENTES.some((campo) => filtros[campo] !== undefined), FILTRO_REQUERIDO)

export type ParametrosBusqueda = z.input<typeof busquedaClientesSchema>

export type TipoCliente = z.infer<typeof tipoClienteSchema>
export type EstadoCliente = (typeof ESTADOS_CLIENTE)[number]
export type CampoOrden = (typeof CAMPOS_ORDEN)[number]
export type ClienteResumen = z.infer<typeof clienteResumenSchema>
export type Cliente = z.infer<typeof clienteSchema>
export type Direccion = z.infer<typeof direccionSchema>
export type PaginaClientes = z.infer<typeof paginaClientesSchema>
