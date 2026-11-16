import { z } from 'zod'

import { LARGO_MAXIMO_CODIGO } from '@/features/contabilidad/lib/cuenta-contable'

/* Formularios de nueva subcuenta y de cambio de nombre (contrato propuesto al backend) */

export const LARGO_MAXIMO_NOMBRE = 100

const nombreCuenta = z
  .string()
  .trim()
  .min(1, 'Escribe el nombre de la cuenta.')
  .max(LARGO_MAXIMO_NOMBRE, `Usa ${LARGO_MAXIMO_NOMBRE} caracteres como máximo.`)

/** El código de la subcuenta empieza por el del padre y le agrega dígitos */
export function subcuentaFormSchema(codigoPadre: string) {
  return z.object({
    codigoCuenta: z
      .string()
      .trim()
      .min(1, 'Escribe el código de la cuenta.')
      .regex(/^\d+$/, 'Usa solo dígitos, sin puntos ni espacios.')
      .max(LARGO_MAXIMO_CODIGO, `Usa ${LARGO_MAXIMO_CODIGO} dígitos como máximo.`)
      .refine((codigo) => codigo.startsWith(codigoPadre), `Debe empezar por ${codigoPadre}, el código de la cuenta superior.`)
      .refine((codigo) => codigo.length > codigoPadre.length, `Agrega dígitos después de ${codigoPadre}.`),
    nombreCuenta,
    esImputable: z.boolean(),
  })
}

export type SubcuentaFormInput = z.input<ReturnType<typeof subcuentaFormSchema>>
export type SubcuentaFormData = z.output<ReturnType<typeof subcuentaFormSchema>>

export const nombreFormSchema = z.object({ nombreCuenta })

export type NombreFormInput = z.input<typeof nombreFormSchema>
export type NombreFormData = z.output<typeof nombreFormSchema>

/** aria-invalid y aria-describedby del control, enlazados al error o a la ayuda de CampoCuenta */
export const a11yCampoCuenta = (id: string, error?: string, ayuda?: string) => ({
  'aria-invalid': !!error,
  'aria-describedby': error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined,
})
