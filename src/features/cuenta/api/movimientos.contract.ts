import { z } from 'zod'

/*
 * Contrato de los movimientos de una cuenta (A-07) en camelCase.
 *
 * - CTA-06 GET /cuentas/{idCuenta}/movimientos?desde&hasta&tipoTransaccion&page&pageSize&sort
 *
 * Roles: ASESOR, CAJERO, SUPERVISOR y ADMIN. `desde` y `hasta` son obligatorios (`YYYY-MM-DD`,
 * inclusivos, por fecha contable). El backend no usa un catálogo de tipos: `tipoTransaccion` es
 * texto libre de hasta 30 caracteres. Sin `sort` ordena por `fechaHoraSistema` descendente. El
 * dinero es `Money` (Decimal serializado como float): llega como number JSON, igual que en CTA-04.
 * Un reverso es un movimiento más de la cuenta.
 */

const BASE = '/api/v1'

export const MOVIMIENTOS_ENDPOINTS = {
  movimientos: (idCuenta: number) => `${BASE}/cuentas/${idCuenta}/movimientos`,
} as const

/** Máximo de `tipoTransaccion` que acepta el backend */
export const TIPO_TRANSACCION_MAX = 30

export const movimientoSchema = z.object({
  idMovimiento: z.number(),
  idTransaccion: z.number(),
  /** Puede ser null: no todo movimiento tiene comprobante */
  numeroComprobante: z.string().nullable(),
  tipoTransaccion: z.string(),
  /** «D» débito (sale dinero) · «C» crédito (entra dinero) */
  tipoMovimiento: z.enum(['C', 'D']),
  rolCuenta: z.enum(['Origen', 'Destino']).nullable(),
  monto: z.number(),
  saldoAnterior: z.number(),
  saldoPosterior: z.number(),
  /** Día contable `YYYY-MM-DD`, sin hora */
  fechaContable: z.string(),
  /** ISO con zona */
  fechaHoraSistema: z.string(),
  idCanal: z.number().nullable(),
})

export const paginaMovimientosSchema = z.object({
  items: z.array(movimientoSchema),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
})

export type Movimiento = z.infer<typeof movimientoSchema>
export type PaginaMovimientos = z.infer<typeof paginaMovimientosSchema>
