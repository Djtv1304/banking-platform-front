import { z } from 'zod'

import { ID_MONEDA_USD, type CuentaCreate } from '@/features/cuenta/api/apertura.contract'
import { formatearMonto } from '@/features/cuenta/lib/formato'

/*
 * Formulario de apertura de cuenta (A-01 / CTA-01). Los campos son texto y `aCuentaCreate` arma el
 * body numérico. El cliente se busca fuera del formulario: aquí solo vive lo que se envía.
 * El mínimo depende del producto elegido, así que el esquema se crea con él.
 */

/** Hasta 16 enteros y 2 decimales (decimal(18,2)); se acepta punto o coma decimal, sin separador de miles */
const MONTO_REGEX = /^\d{1,16}([.,]\d{1,2})?$/

/** `abort`: el primer error del monto detiene las demás reglas (no se compara un monto mal escrito) */
const corta = (error: string) => ({ error, abort: true })

export function crearAperturaCuentaSchema(montoMinimo: number | null) {
  const minimo = montoMinimo ?? 0
  return z.object({
    idSubProducto: z.string().min(1, 'Selecciona el producto de la cuenta.'),
    idAgencia: z.string().length(3, 'Selecciona la agencia donde se abre la cuenta.'),
    montoInicial: z
      .string()
      .trim()
      .min(1, corta('Ingresa el depósito de apertura.'))
      .regex(MONTO_REGEX, corta('Ingresa un monto válido en dólares, con 2 decimales como máximo.'))
      .transform((valor) => Number(valor.replace(',', '.')))
      .refine(
        (valor) => valor >= minimo,
        corta(`El depósito mínimo de apertura de este producto es ${formatearMonto(minimo)}.`),
      ),
  })
}

export type AperturaCuentaSchema = ReturnType<typeof crearAperturaCuentaSchema>
export type AperturaCuentaInput = z.input<AperturaCuentaSchema>
export type AperturaCuentaData = z.output<AperturaCuentaSchema>

export const aperturaVacia = (idAgencia = ''): AperturaCuentaInput => ({
  idSubProducto: '',
  idAgencia,
  montoInicial: '',
})

/** Body de CTA-01; la moneda siempre es USD */
export const aCuentaCreate = (valor: AperturaCuentaData, idCliente: number): CuentaCreate => ({
  idCliente,
  idSubProducto: Number(valor.idSubProducto),
  idAgencia: valor.idAgencia,
  montoInicial: valor.montoInicial,
  idMoneda: ID_MONEDA_USD,
})
