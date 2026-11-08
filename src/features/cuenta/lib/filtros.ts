import { z } from 'zod'

import { estadoCuentaSchema } from '@/features/cuenta/api/cuentas.contract'

/*
 * Lo que la pantalla le pide a la API: filtros de la búsqueda (CTA-02), paginación e id de la
 * cuenta en la URL. Los filtros viven solo en memoria: no van a la URL para que las
 * identificaciones no queden en el historial ni en los logs.
 */

export const PAGE_SIZE = 20

/** Cédula (10 dígitos) o RUC (13 dígitos) */
const IDENTIFICACION_REGEX = /^(\d{10}|\d{13})$/

/** Mayor valor de una columna INT de SQL Server */
const INT_MAX = 2_147_483_647

/** Todos los filtros son opcionales y se combinan; vacío = sin filtro */
export const filtrosCuentasSchema = z.object({
  numeroCuenta: z.string().trim(),
  estado: z.union([z.literal(''), estadoCuentaSchema]),
  idAgencia: z.string(),
  identificacion: z
    .string()
    .trim()
    .refine((valor) => valor === '' || IDENTIFICACION_REGEX.test(valor), {
      error: 'Ingresa una cédula de 10 dígitos o un RUC de 13 dígitos.',
    }),
})

export type FiltrosCuentasInput = z.input<typeof filtrosCuentasSchema>
export type FiltrosCuentas = z.output<typeof filtrosCuentasSchema>

export const FILTROS_VACIOS: FiltrosCuentas = { numeroCuenta: '', estado: '', idAgencia: '', identificacion: '' }

/**
 * Parámetros de CTA-02 sin filtros vacíos: el backend compara por igualdad, así que un `''` no
 * encontraría nada. La identificación nunca viaja a CTA-02: se traduce antes a `idCliente`.
 */
export function armarParametros(
  filtros: Pick<FiltrosCuentas, 'numeroCuenta' | 'estado' | 'idAgencia'>,
  idCliente: number | undefined,
  page: number,
) {
  const params: Record<string, string> = { page: String(page), pageSize: String(PAGE_SIZE) }
  const numeroCuenta = filtros.numeroCuenta.trim()
  if (numeroCuenta) params.numeroCuenta = numeroCuenta
  if (filtros.estado) params.estado = filtros.estado
  if (filtros.idAgencia) params.idAgencia = filtros.idAgencia
  if (idCliente !== undefined) params.idCliente = String(idCliente)
  return params
}

export const totalPaginas = (total: number, pageSize = PAGE_SIZE) => Math.ceil(total / pageSize)

/** `idCuenta` de la URL: entero positivo que cabe en la columna INT, o `null` si no es válido */
export function leerIdCuenta(valor: string | undefined) {
  if (!valor || !/^\d+$/.test(valor)) return null
  const idCuenta = Number(valor)
  return idCuenta > 0 && idCuenta <= INT_MAX ? idCuenta : null
}
