import { z } from 'zod'

import { cuentaSchema } from '@/features/cuenta/api/cuentas.contract'

export const APERTURA_ENDPOINT = '/api/v1/cuentas'

export interface CuentaCreate {
  idCliente: number
  idSubProducto: number
}

export const cuentaAbiertaSchema = cuentaSchema.extend({
  saldo: z.number(),
  saldoRetenido: z.number(),
})

export type CuentaAbierta = z.infer<typeof cuentaAbiertaSchema>
