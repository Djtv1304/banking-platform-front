import { z } from 'zod'

import { LARGO_MAXIMO_CODIGO } from '@/features/contabilidad/lib/cuenta-contable'

/* Formularios de nueva subcuenta y de cambio de nombre (contrato propuesto al backend) */

export const LARGO_MAXIMO_NOMBRE = 100

const nombreCuenta = z
  .string()
  .trim()
  .min(1, 'Escribe el nombre de la cuenta.')
  .max(LARGO_MAXIMO_NOMBRE, `Usa ${LARGO_MAXIMO_NOMBRE} caracteres como máximo.`)

/** Dígitos que agrega cada nivel al código: el catálogo del regulador crece de dos en dos */
export const DIGITOS_POR_NIVEL = 2

const SUFIJOS = Array.from({ length: 99 }, (_, i) => String(i + 1).padStart(DIGITOS_POR_NIVEL, '0'))

/** Menor código libre del padre (sufijo 01 a 99); null si están los 99 ocupados o el código pasaría del máximo */
export function siguienteCodigoLibre(codigoPadre: string, codigosHijas: Iterable<string>): string | null {
  if (codigoPadre.length + DIGITOS_POR_NIVEL > LARGO_MAXIMO_CODIGO) return null
  const usados = new Set(codigosHijas)
  const libre = SUFIJOS.find((sufijo) => !usados.has(codigoPadre + sufijo))
  return libre === undefined ? null : codigoPadre + libre
}

const esCodigoDeHija = (codigo: string, codigoPadre: string) =>
  codigo.length === codigoPadre.length + DIGITOS_POR_NIVEL &&
  codigo.startsWith(codigoPadre) &&
  /^(0[1-9]|[1-9]\d)$/.test(codigo.slice(codigoPadre.length))

/** El código de la subcuenta es el del padre más 2 dígitos (01 a 99) y no repite el de otra hija */
export function subcuentaFormSchema(codigoPadre: string, codigosHijas: readonly string[] = []) {
  const existentes = new Set(codigosHijas)
  return z.object({
    codigoCuenta: z
      .string()
      .trim()
      .min(1, 'Escribe el código de la cuenta.')
      .regex(/^\d+$/, 'Usa solo dígitos, sin puntos ni espacios.')
      .max(LARGO_MAXIMO_CODIGO, `Usa ${LARGO_MAXIMO_CODIGO} dígitos como máximo.`)
      .refine(
        (codigo) => esCodigoDeHija(codigo, codigoPadre),
        `El código es el de la cuenta superior más ${DIGITOS_POR_NIVEL} dígitos: de ${codigoPadre}01 a ${codigoPadre}99.`,
      )
      .superRefine((codigo, ctx) => {
        if (existentes.has(codigo)) ctx.addIssue({ code: 'custom', message: `Ya existe la cuenta ${codigo}.` })
      }),
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
