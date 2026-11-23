import { z } from 'zod'

import { LARGO_CODIGO_PADRE, LARGO_CODIGO_SUBCUENTA, LARGO_CODIGO_ULTIMO_NIVEL } from '@/features/contabilidad/lib/cuenta-contable'

/* Formularios de nueva subcuenta y de cambio de nombre (contrato propuesto al backend) */

export const LARGO_MAXIMO_NOMBRE = 100

const nombreCuenta = z
  .string()
  .trim()
  .min(1, 'Escribe el nombre de la cuenta.')
  .max(LARGO_MAXIMO_NOMBRE, `Usa ${LARGO_MAXIMO_NOMBRE} caracteres como máximo.`)

/** Dígitos que la subcuenta agrega al código de su cuenta de 6: 6 + 2 = 8 */
export const DIGITOS_POR_NIVEL = LARGO_CODIGO_SUBCUENTA - LARGO_CODIGO_PADRE

const SUFIJOS = Array.from({ length: 99 }, (_, i) => String(i + 1).padStart(DIGITOS_POR_NIVEL, '0'))

/**
 * El padre admite subcuentas si es de 6 dígitos o, según el CUC («adicionar dígitos a las
 * subcuentas de los últimos niveles»), si es una cuenta de 4 dígitos sin subcuentas (p. ej. 2105).
 */
export const admiteSubcuentas = (codigoPadre: string, ultimoNivel = false) =>
  codigoPadre.length === LARGO_CODIGO_PADRE || (ultimoNivel && codigoPadre.length === LARGO_CODIGO_ULTIMO_NIVEL)

/** Menor código libre del padre (sufijo 01 a 99); null si están los 99 ocupados o el padre no admite subcuentas */
export function siguienteCodigoLibre(codigoPadre: string, codigosHijas: Iterable<string>, ultimoNivel = false): string | null {
  if (!admiteSubcuentas(codigoPadre, ultimoNivel)) return null
  const usados = new Set(codigosHijas)
  const libre = SUFIJOS.find((sufijo) => !usados.has(codigoPadre + sufijo))
  return libre === undefined ? null : codigoPadre + libre
}

const esCodigoDeHija = (codigo: string, codigoPadre: string, ultimoNivel: boolean) =>
  admiteSubcuentas(codigoPadre, ultimoNivel) &&
  codigo.length === codigoPadre.length + DIGITOS_POR_NIVEL &&
  codigo.startsWith(codigoPadre) &&
  /^(0[1-9]|[1-9]\d)$/.test(codigo.slice(codigoPadre.length))

/** El código de la subcuenta es de 8 dígitos: el del padre (6) más 2 (01 a 99), y no repite el de otra hija */
export function subcuentaFormSchema(codigoPadre: string, codigosHijas: readonly string[] = [], ultimoNivel = false) {
  const existentes = new Set(codigosHijas)
  const largo = admiteSubcuentas(codigoPadre, ultimoNivel) ? codigoPadre.length + DIGITOS_POR_NIVEL : LARGO_CODIGO_SUBCUENTA
  return z.object({
    codigoCuenta: z
      .string()
      .trim()
      .min(1, 'Escribe el código de la cuenta.')
      .regex(/^\d+$/, 'Usa solo dígitos, sin puntos ni espacios.')
      .refine(
        (codigo) => esCodigoDeHija(codigo, codigoPadre, ultimoNivel),
        `El código tiene ${largo} dígitos: el de la cuenta superior más ${DIGITOS_POR_NIVEL} (de ${codigoPadre}01 a ${codigoPadre}99).`,
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
