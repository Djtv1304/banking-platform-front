import { z } from 'zod'

import { ESTADOS_TARJETA } from '@/features/tarjetas/api/tarjetas.contract'

/*
 * Lo que la pantalla le pide a la API: filtros de la búsqueda (TAR-02), paginación e id de la
 * tarjeta en la URL. Los filtros viven solo en memoria, no en la URL.
 */

export const PAGE_SIZE = 20

/** Mayor valor de una columna INT de SQL Server */
const INT_MAX = 2_147_483_647

/** Entero positivo que cabe en la columna INT, o `null` si no lo es */
export function leerId(valor: string | undefined) {
  const texto = valor?.trim()
  if (!texto || !/^\d+$/.test(texto)) return null
  const id = Number(texto)
  return id > 0 && id <= INT_MAX ? id : null
}

const filtroId = (nombre: string) =>
  z
    .string()
    .trim()
    .refine((valor) => valor === '' || leerId(valor) !== null, {
      error: `Ingresa un ${nombre} válido: solo números enteros mayores que 0.`,
    })

/** Todos los filtros son opcionales y se combinan; vacío = sin filtro */
export const filtrosTarjetasSchema = z.object({
  idCliente: filtroId('ID de cliente'),
  idCuenta: filtroId('ID de cuenta'),
  estado: z.union([z.literal(''), z.enum(ESTADOS_TARJETA)]),
})

export type FiltrosTarjetasInput = z.input<typeof filtrosTarjetasSchema>
export type FiltrosTarjetas = z.output<typeof filtrosTarjetasSchema>

export const FILTROS_VACIOS: FiltrosTarjetas = { idCliente: '', idCuenta: '', estado: '' }

/**
 * Parámetros de TAR-02 sin filtros vacíos: el backend compara por igualdad y rechaza lo que no
 * conoce, así que un `''` o un parámetro de más darían error.
 */
export function armarParametros(filtros: FiltrosTarjetas, page: number) {
  const params: Record<string, string> = { page: String(page), pageSize: String(PAGE_SIZE) }
  if (filtros.idCliente) params.idCliente = filtros.idCliente
  if (filtros.idCuenta) params.idCuenta = filtros.idCuenta
  if (filtros.estado) params.estado = filtros.estado
  return params
}

export const totalPaginas = (total: number, pageSize = PAGE_SIZE) => Math.ceil(total / pageSize)

/** «Página 2 de 3 · 45 resultados» */
export const resumenPaginacion = (page: number, total: number, pageSize = PAGE_SIZE) =>
  `Página ${page} de ${totalPaginas(total, pageSize)} · ${total} ${total === 1 ? 'resultado' : 'resultados'}`
