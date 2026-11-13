import { z } from 'zod'

import { cuentaSchema } from '@/features/cuenta/api/cuentas.contract'

/*
 * Contrato de la apertura de cuenta (A-01) en camelCase.
 *
 * - CTA-01 POST /cuentas → abre la cuenta ACTIVA con el depósito inicial (roles ASESOR y ADMIN)
 *
 * Errores de negocio (ProblemDetails con `code`): 409 CLIENTE_NO_ACTIVO, 409 RIESGO_RECHAZADO,
 * 422 PRODUCTO_NO_ES_CUENTA, 422 MONTO_APERTURA_INSUFICIENTE y 409 AGENCIA_INACTIVA.
 * El dinero viaja como number JSON; la cooperativa opera solo en USD (idMoneda 840).
 */

export const APERTURA_ENDPOINT = '/api/v1/cuentas'

export const ID_MONEDA_USD = 840

/** Body de CTA-01 (`CuentaCreate` del backend) */
export interface CuentaCreate {
  idCliente: number
  idSubProducto: number
  /** Exactamente 3 caracteres */
  idAgencia: string
  /** ≥ 0 y ≥ `montoAperturaMinimo` del producto */
  montoInicial: number
  idMoneda: typeof ID_MONEDA_USD
}

/** 201 de CTA-01: la cuenta completa, con el saldo que dejó el depósito inicial */
export const cuentaAbiertaSchema = cuentaSchema.extend({
  saldo: z.number(),
  saldoRetenido: z.number(),
})

export type CuentaAbierta = z.infer<typeof cuentaAbiertaSchema>
