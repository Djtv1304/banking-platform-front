import { z } from 'zod'

import type { SubProductoParametros } from '@/features/organizacion/api/productos.contract'

/*
 * Formulario de parámetros de un subproducto de crédito: mismas reglas que el backend
 * (PUT /api/v1/productos/subproductos/{id}/parametros). Un campo vacío queda sin límite (null).
 */

const monto = z
  .string()
  .trim()
  .refine((v) => v === '' || /^\d{1,16}(\.\d{1,2})?$/.test(v), 'Usa un monto como 10000 o 10000.50.')
  .transform((v) => (v === '' ? null : Number(v)))
  .refine((v) => v === null || v > 0, 'Debe ser mayor que 0.')

const plazo = z
  .string()
  .trim()
  .refine((v) => v === '' || /^\d{1,3}$/.test(v), 'Usa meses enteros.')
  .transform((v) => (v === '' ? null : Number(v)))
  .refine((v) => v === null || (v >= 1 && v <= 600), 'Entre 1 y 600 meses.')

export const parametrosFormSchema = z
  .object({
    montoMinimo: monto,
    montoMaximo: monto,
    plazoMinimoMeses: plazo,
    plazoMaximoMeses: plazo,
    tasasInteres: z.array(z.number()),
    sistemasAmortizacion: z.array(z.string()),
  })
  .superRefine((d, ctx) => {
    if (d.montoMinimo !== null && d.montoMaximo !== null && d.montoMaximo < d.montoMinimo) {
      ctx.addIssue({ code: 'custom', path: ['montoMaximo'], message: 'Debe ser mayor o igual que el mínimo.' })
    }
    if (d.plazoMinimoMeses !== null && d.plazoMaximoMeses !== null && d.plazoMaximoMeses < d.plazoMinimoMeses) {
      ctx.addIssue({ code: 'custom', path: ['plazoMaximoMeses'], message: 'Debe ser mayor o igual que el mínimo.' })
    }
  })

export type ParametrosFormInput = z.input<typeof parametrosFormSchema>
/** Ya tiene la forma del body del PUT */
export type ParametrosFormData = z.output<typeof parametrosFormSchema>

const texto = (valor: number | null | undefined) => (valor == null ? '' : String(valor))

export function valoresParametros(p: SubProductoParametros): ParametrosFormInput {
  return {
    montoMinimo: texto(p.montoMinimo),
    montoMaximo: texto(p.montoMaximo),
    plazoMinimoMeses: texto(p.plazoMinimoMeses),
    plazoMaximoMeses: texto(p.plazoMaximoMeses),
    tasasInteres: p.tasasInteres,
    sistemasAmortizacion: p.sistemasAmortizacion,
  }
}

/** Marca o desmarca un elemento del checklist sin repetirlo */
export function alternar<T>(lista: readonly T[], valor: T, marcado: boolean): T[] {
  const sin = lista.filter((v) => v !== valor)
  return marcado ? [...sin, valor] : sin
}

export const porcentaje = (fraccion: number) =>
  `${(fraccion * 100).toLocaleString('es-EC', { maximumFractionDigits: 2 })} %`

export const dinero = (valor: number | null | undefined) =>
  valor == null ? 'sin límite' : valor.toLocaleString('es-EC', { style: 'currency', currency: 'USD' })
