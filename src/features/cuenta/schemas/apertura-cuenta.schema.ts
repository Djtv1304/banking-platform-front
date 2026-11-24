import { z } from 'zod'

import type { CuentaCreate } from '@/features/cuenta/api/apertura.contract'

export const aperturaCuentaSchema = z.object({
  idSubProducto: z.string().regex(/^\d+$/, 'Selecciona el producto de la cuenta.'),
})

export type AperturaCuentaInput = z.input<typeof aperturaCuentaSchema>
export type AperturaCuentaData = z.output<typeof aperturaCuentaSchema>

export const aperturaVacia: AperturaCuentaInput = { idSubProducto: '' }

export const aCuentaCreate = (valor: AperturaCuentaData, idCliente: number): CuentaCreate => ({
  idCliente,
  idSubProducto: Number(valor.idSubProducto),
})
