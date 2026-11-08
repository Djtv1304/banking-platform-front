import { z } from 'zod'

/*
 * Contrato de los cupos por canal de una cuenta (A-06) en camelCase.
 *
 * - CTA-07 GET /cuentas/{idCuenta}/cupos                    → cupo que rige en cada canal y lo consumido
 * - CTA-08 PUT /cuentas/{idCuenta}/cupos/{idCanal}          → crea o cambia el cupo personalizado
 * - CTA-09 GET /cuentas/{idCuenta}/cupos/{idCanal}/historial → cambios del personalizado, paginados
 *
 * Roles: CTA-07 ASESOR, SUPERVISOR y ADMIN · CTA-08 SUPERVISOR y ADMIN · CTA-09 SUPERVISOR, AUDITOR
 * y ADMIN. El dinero es `Money` (Decimal serializado como float): llega como number JSON, igual que
 * en CTA-04. El backend no devuelve el disponible: se calcula en `lib/cupos.ts`.
 */

const BASE = '/api/v1'

export const CUPOS_ENDPOINTS = {
  cupos: (idCuenta: number) => `${BASE}/cuentas/${idCuenta}/cupos`,
  cupo: (idCuenta: number, idCanal: number) => `${BASE}/cuentas/${idCuenta}/cupos/${idCanal}`,
  historial: (idCuenta: number, idCanal: number) => `${BASE}/cuentas/${idCuenta}/cupos/${idCanal}/historial`,
} as const

/** «Personalizado» si rige el de la cuenta (vigente); «Producto» si rige el del subproducto */
export const cupoEfectivoSchema = z.object({
  idCanal: z.number(),
  origen: z.enum(['Personalizado', 'Producto']),
  cupoDiario: z.number(),
  cupoMensual: z.number(),
  montoMaxTransaccion: z.number(),
  maxTransaccionesDia: z.number(),
  /** Último día en que rige (inclusive, hora de Ecuador) `YYYY-MM-DD`; null no caduca */
  fechaVigencia: z.string().nullable(),
  consumidoHoy: z.number(),
  consumidoMes: z.number(),
})

/** CTA-09 · Los importes son null cuando no había valor (p. ej. «anterior» al crear el personalizado) */
export const cupoHistorialSchema = z.object({
  idCupoModHis: z.number(),
  cupoDiarioAnterior: z.number().nullable(),
  cupoDiarioNuevo: z.number().nullable(),
  cupoMensualAnterior: z.number().nullable(),
  cupoMensualNuevo: z.number().nullable(),
  montoMaxTxAnterior: z.number().nullable(),
  montoMaxTxNuevo: z.number().nullable(),
  /** Id interno del usuario que hizo el cambio */
  modificadoPor: z.number(),
  /** ISO con zona (-05:00) */
  fechaModificacion: z.string(),
})

/** Body de CTA-08 (`extra="forbid"`: ni un campo más). `maxTransaccionesDia` es entero estricto */
export interface CupoUpdate {
  cupoDiario: number
  cupoMensual: number
  montoMaxTransaccion: number
  maxTransaccionesDia: number
  fechaVigencia: string | null
}

export type CupoEfectivo = z.infer<typeof cupoEfectivoSchema>
export type CupoHistorial = z.infer<typeof cupoHistorialSchema>
