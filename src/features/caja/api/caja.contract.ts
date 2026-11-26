import { z } from 'zod'

/*
 * Contrato del módulo de caja (`/api/v1/caja`) en camelCase, según `Backend/app/modules/caja` de develop.
 *
 * - CAJ-01 GET  /cajas-fisicas?idAgencia&activa            (CAJERO, SUPERVISOR, ADMIN)
 * - CAJ-03 POST /jornadas { idCajaFisica, dineroInicial, observacion? } → 201 (CAJERO)
 * - CAJ-04 GET  /jornadas/actual                            (CAJERO; 404 SIN_JORNADA_ABIERTA si no tiene)
 * - CAJ-08 GET  /jornadas/{idJornada}/dotaciones             (CAJERO, SUPERVISOR, CONTADOR)
 * - CAJ-12 GET  /jornadas/{idJornada}/movimientos?page&pageSize&sort (ídem; sort `fechaHora,desc`)
 *
 * El body se valida aparte porque el backend rechaza con 400 los campos que no conoce.
 * El dinero llega como number JSON y las fechas en hora de Ecuador (ISO con desfase).
 */

const BASE = '/api/v1/caja'

export const CAJA_ENDPOINTS = {
  cajasFisicas: `${BASE}/cajas-fisicas`,
  jornadas: `${BASE}/jornadas`,
  jornadaActual: `${BASE}/jornadas/actual`,
  dotaciones: (idJornada: number) => `${BASE}/jornadas/${idJornada}/dotaciones`,
  movimientos: (idJornada: number) => `${BASE}/jornadas/${idJornada}/movimientos`,
} as const

/** Ventanilla física de una agencia; `estado` es true cuando está activa */
export const cajaFisicaSchema = z.object({
  idCajaFisica: z.number(),
  idAgencia: z.string().nullable().optional(),
  codigoCaja: z.string().nullable().optional(),
  estado: z.boolean().nullable().optional(),
  descripcionEstado: z.string().nullable().optional(),
  limiteEfectivoCaja: z.number().nullable().optional(),
})

export const ESTADOS_JORNADA = ['ABIERTA', 'CERRADA', 'CANCELADA'] as const

export const jornadaSchema = z.object({
  idJornadaCaja: z.number(),
  idUsuario: z.number(),
  idCajaFisica: z.number(),
  idAgencia: z.string(),
  fechaHoraApertura: z.string(),
  fechaHoraCierre: z.string().nullable().optional(),
  dineroInicial: z.number(),
  estado: z.enum(ESTADOS_JORNADA),
  observacion: z.string().nullable().optional(),
})

/** `tipoDotacion` (INICIAL | ADICIONAL) y `estado` se leen como texto: un valor nuevo no tumba la pantalla */
export const dotacionSchema = z.object({
  idDotacionCaja: z.number(),
  idJornadaCaja: z.number().nullable().optional(),
  idBoveda: z.number().nullable().optional(),
  tipoDotacion: z.string().nullable().optional(),
  monto: z.number().nullable().optional(),
  idMovimientoBoveda: z.number().nullable().optional(),
  bovedaBajoMinimo: z.boolean().nullable().optional(),
  estado: z.string().nullable().optional(),
})

export const movimientoCajaSchema = z.object({
  idMovimientoCaja: z.number(),
  idTransaccion: z.number().nullable().optional(),
  idJornadaCaja: z.number().nullable().optional(),
  idTipoMovimiento: z.number().nullable().optional(),
  codigoTipoMovimiento: z.string().nullable().optional(),
  naturaleza: z.string().nullable().optional(),
  monto: z.number().nullable().optional(),
  fechaHora: z.string().nullable().optional(),
  observacion: z.string().nullable().optional(),
  idAsientoContable: z.number().nullable().optional(),
})

export const paginaMovimientosCajaSchema = z.object({
  items: z.array(movimientoCajaSchema),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
})

/** CAJ-03 · Texto500 del backend; los campos desconocidos dan 400, por eso el objeto es estricto */
export const abrirJornadaSchema = z.strictObject({
  idCajaFisica: z.number().int().positive(),
  dineroInicial: z.number().min(0),
  observacion: z.string().trim().max(500, 'Máximo 500 caracteres.').optional(),
})

export type CajaFisica = z.infer<typeof cajaFisicaSchema>
export type Jornada = z.infer<typeof jornadaSchema>
export type Dotacion = z.infer<typeof dotacionSchema>
export type MovimientoCaja = z.infer<typeof movimientoCajaSchema>
export type PaginaMovimientosCaja = z.infer<typeof paginaMovimientosCajaSchema>
export type AbrirJornada = z.infer<typeof abrirJornadaSchema>
