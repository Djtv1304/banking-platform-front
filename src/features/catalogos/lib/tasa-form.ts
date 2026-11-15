import { z } from 'zod'

import { tipoTasaSchema, type TasaInteresCreate } from '@/features/catalogos/api/catalogos.contract'

/* Formulario de una tasa de interés: mismas reglas que POST /api/v1/catalogos/tasas-interes */

const numero = (patron: RegExp, mensaje: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || patron.test(v), mensaje)
    .transform((v) => (v === '' ? undefined : Number(v)))

const FECHA = /^\d{4}-\d{2}-\d{2}$/

/** En el formulario la tasa se escribe en porcentaje (16 = 16 %); el backend la guarda como fracción */
export const tasaFormSchema = z
  .object({
    tipoTasa: tipoTasaSchema,
    idTipoCredito: z.string(),
    tasa: numero(/^\d{1,3}(\.\d{1,2})?$/, 'Usa un porcentaje como 16 o 16.5.'),
    recargoMora: numero(/^\d{1,3}(\.\d{1,2})?$/, 'Usa un porcentaje como 2.'),
    plazoMaximoMeses: numero(/^\d{1,3}$/, 'Usa meses enteros.'),
    montoMinimo: numero(/^\d{1,16}(\.\d{1,2})?$/, 'Usa un monto como 500 o 500.50.'),
    montoMaximo: numero(/^\d{1,16}(\.\d{1,2})?$/, 'Usa un monto como 20000.'),
    vigenciaDesde: z.string().regex(FECHA, 'Elige la fecha de inicio.'),
    vigenciaHasta: z.string().refine((v) => v === '' || FECHA.test(v), 'Fecha inválida.'),
  })
  .superRefine((d, ctx) => {
    if (d.tasa === undefined || d.tasa <= 0 || d.tasa > 100) ctx.addIssue({ code: 'custom', path: ['tasa'], message: 'Entre 0.01 y 100 %.' })
    if (d.recargoMora !== undefined && d.recargoMora > 100) ctx.addIssue({ code: 'custom', path: ['recargoMora'], message: 'Hasta 100 %.' })
    const credito = d.tipoTasa === 'CREDITO'
    if (credito && !d.idTipoCredito) ctx.addIssue({ code: 'custom', path: ['idTipoCredito'], message: 'Elige el tipo de crédito.' })
    // El plazo lo exige crédito; en tarjeta (p. ej. diferidos) es opcional
    if ((credito && d.plazoMaximoMeses === undefined) || (d.plazoMaximoMeses !== undefined && (d.plazoMaximoMeses < 1 || d.plazoMaximoMeses > 600))) {
      ctx.addIssue({ code: 'custom', path: ['plazoMaximoMeses'], message: 'Entre 1 y 600 meses.' })
    }
    if (d.montoMinimo === 0) ctx.addIssue({ code: 'custom', path: ['montoMinimo'], message: 'Debe ser mayor que 0.' })
    if (d.montoMaximo === 0) ctx.addIssue({ code: 'custom', path: ['montoMaximo'], message: 'Debe ser mayor que 0.' })
    if (d.montoMinimo !== undefined && d.montoMaximo !== undefined && d.montoMaximo < d.montoMinimo) {
      ctx.addIssue({ code: 'custom', path: ['montoMaximo'], message: 'Debe ser mayor o igual que el mínimo.' })
    }
    if (d.vigenciaHasta && d.vigenciaHasta <= d.vigenciaDesde) {
      ctx.addIssue({ code: 'custom', path: ['vigenciaHasta'], message: 'Debe ser posterior al inicio.' })
    }
  })

export type TasaFormInput = z.input<typeof tasaFormSchema>
export type TasaFormData = z.output<typeof tasaFormSchema>

/** De porcentaje a fracción, sin errores de coma flotante (16.5 → 0.165) */
const fraccion = (porciento: number) => Math.round(porciento * 100) / 10000

export function payloadTasa(d: TasaFormData): TasaInteresCreate {
  return {
    tipoTasa: d.tipoTasa,
    ...(d.tipoTasa === 'CREDITO' && { idTipoCredito: Number(d.idTipoCredito) }),
    tasaNominalAnual: fraccion(d.tasa ?? 0),
    recargoMoraSobreTasa: fraccion(d.recargoMora ?? 0),
    ...(d.plazoMaximoMeses !== undefined && { plazoMaximoMeses: d.plazoMaximoMeses }),
    ...(d.montoMinimo !== undefined && { montoMinimo: d.montoMinimo }),
    ...(d.montoMaximo !== undefined && { montoMaximo: d.montoMaximo }),
    vigenciaDesde: d.vigenciaDesde,
    ...(d.vigenciaHasta && { vigenciaHasta: d.vigenciaHasta }),
  }
}
