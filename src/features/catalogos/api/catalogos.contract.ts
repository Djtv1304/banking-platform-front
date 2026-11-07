import { z } from 'zod'

/*
 * Contrato de la API de catálogos (F-09, CAT-01 a CAT-10) en camelCase.
 *
 * Son de solo lectura y exigen sesión (401 sin cookie). El backend ya filtra los registros
 * activos donde la tabla tiene `Estado`, y ya los devuelve ordenados: la SPA no vuelve a filtrar.
 * Las respuestas se validan en tiempo de ejecución porque un 200 no garantiza JSON (si `/api` no
 * llega al backend, el hosting puede responder `index.html` con 200).
 */

const BASE = '/api/v1/catalogos'

export const CATALOGOS_ENDPOINTS = {
  paises: `${BASE}/paises`,
  ciudades: (codigoPais: string) => `${BASE}/paises/${encodeURIComponent(codigoPais)}/ciudades`,
  actividadesEconomicas: `${BASE}/actividades-economicas`,
  tiposAntecedente: `${BASE}/tipos-antecedente`,
  denominaciones: `${BASE}/denominaciones`,
  agencias: `${BASE}/agencias`,
  productos: `${BASE}/productos`,
  canales: `${BASE}/canales`,
  tiposCredito: `${BASE}/tipos-credito`,
  tiposMovimientoCaja: `${BASE}/tipos-movimiento-caja`,
} as const

/** CAT-01 · Ordenados por nombre. `codigoPais` es ISO 3166-1 alfa-3 (`ECU`) */
export const paisSchema = z.object({
  codigoPais: z.string(),
  codigoNumerico: z.string(),
  nombrePais: z.string(),
})

/** CAT-02 · Ordenadas por provincia y nombre. País inexistente → 404 PAIS_NO_ENCONTRADO */
export const ciudadSchema = z.object({
  idCiudad: z.number(),
  codigoPais: z.string(),
  nombre: z.string(),
  provincia: z.string(),
})

/** CAT-03 · Solo activas, ordenadas por área y descripción (la SPA agrupa por área) */
export const actividadEconomicaSchema = z.object({
  idActividadEconomica: z.number(),
  descripcion: z.string(),
  areaActividad: z.string(),
})

/** CAT-04 · `puedeImpedirVinculacion` solo informa; la regla que bloquea vive en C-08 */
export const tipoAntecedenteSchema = z.object({
  idTipoAntecedente: z.number(),
  nombre: z.string(),
  categoria: z.enum(['EnRevision', 'Critico']),
  puedeImpedirVinculacion: z.boolean(),
})

/** CAT-05 · Orden de conteo: billetes primero, luego por valor descendente */
export const denominacionSchema = z.object({
  idDenominacion: z.number(),
  tipoPieza: z.enum(['Billete', 'Moneda']),
  valor: z.number(),
  descripcion: z.string(),
})

/**
 * CAT-06 · Todas las agencias con su estado (`A` activa, `I` inactiva, `C` cerrada): los formularios
 * que crean operaciones solo deben ofrecer las `A`. Orden: Matriz primero, luego por código.
 */
export const agenciaSchema = z.object({
  idAgencia: z.string(),
  codigo: z.string(),
  nombre: z.string(),
  tipoAgencia: z.enum(['Matriz', 'Sucursal']),
  provincia: z.string(),
  ciudad: z.string(),
  estado: z.enum(['A', 'I', 'C']),
})

export const tipoProductoSchema = z.enum(['Cuenta', 'Tarjeta', 'Credito'])

/** CAT-07 · Solo activos. Los campos que no aplican al tipo de producto llegan en `null` */
export const productoSchema = z.object({
  idProducto: z.number(),
  codigoProducto: z.string(),
  nombreProducto: z.string(),
  tipoProducto: tipoProductoSchema,
  /** Solo Cuenta */
  montoAperturaMinimo: z.number().nullable(),
  /** Solo Credito */
  idTipoCredito: z.number().nullable(),
  /** Solo Tarjeta */
  idRed: z.number().nullable(),
  /** Solo Cuenta */
  tipoCuenta: z.string().nullable(),
  permiteOperacionesPresenciales: z.boolean(),
})

/** CAT-08 · Solo activos. Los `requiere*` los valida el backend; la SPA solo los muestra */
export const canalSchema = z.object({
  idCanal: z.number(),
  codigoCanal: z.string(),
  nombreCanal: z.string(),
  requiereTarjeta: z.boolean(),
  requierePin: z.boolean(),
  requiereTerminal: z.boolean(),
  requiereJornadaCaja: z.boolean(),
  modo: z.enum(['Digital', 'Presencial', 'Ambos']),
})

/** CAT-09 · Solo activos. Tasa, plazo y montos no van aquí: se piden con CRE-01 */
export const tipoCreditoSchema = z.object({
  idTipoCredito: z.number(),
  codigoTipoCredito: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
})

/** CAT-10 · `naturaleza`: `I` entra efectivo, `E` sale. La SPA muestra `descripcion` */
export const tipoMovimientoCajaSchema = z.object({
  idTipoMovimientoCaja: z.number(),
  codigo: z.string(),
  descripcion: z.string(),
  naturaleza: z.enum(['I', 'E']),
})

export type Pais = z.infer<typeof paisSchema>
export type Ciudad = z.infer<typeof ciudadSchema>
export type ActividadEconomica = z.infer<typeof actividadEconomicaSchema>
export type TipoAntecedente = z.infer<typeof tipoAntecedenteSchema>
export type Denominacion = z.infer<typeof denominacionSchema>
export type Agencia = z.infer<typeof agenciaSchema>
export type TipoProducto = z.infer<typeof tipoProductoSchema>
export type Producto = z.infer<typeof productoSchema>
export type Canal = z.infer<typeof canalSchema>
export type TipoCredito = z.infer<typeof tipoCreditoSchema>
export type TipoMovimientoCaja = z.infer<typeof tipoMovimientoCajaSchema>
