import { z } from 'zod'

import {
  ESTADOS_ARQUEO,
  ESTADOS_SOLICITUD,
  ID_AGENCIA_REGEX,
  TIPOS_ARQUEO,
  TIPOS_BOVEDA,
  TIPOS_MOVIMIENTO,
} from '@/features/boveda/api/bovedas.contract'

/* Lo que las pantallas le piden a BOV-01, BOV-03, BOV-07 y SMV-02: filtros, orden y página */

export const PAGE_SIZE = 20

export interface FiltrosBovedas {
  idAgencia: string
  tipo: '' | (typeof TIPOS_BOVEDA)[number]
}

export const FILTROS_BOVEDAS_VACIOS: FiltrosBovedas = { idAgencia: '', tipo: '' }

/** Parámetros de BOV-01: solo los filtros con valor */
export function armarParametrosBovedas({ idAgencia, tipo }: FiltrosBovedas) {
  const params: Record<string, string> = {}
  if (ID_AGENCIA_REGEX.test(idAgencia)) params.idAgencia = idAgencia
  if (tipo) params.tipo = tipo
  return params
}

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/

const esDiaReal = (valor: string) => {
  if (!FECHA_REGEX.test(valor)) return false
  const [anio, mes, dia] = valor.split('-').map(Number)
  const fecha = new Date(anio, mes - 1, dia)
  return fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia
}

/** Vacía (sin límite) o un día real `YYYY-MM-DD` */
const fechaOpcional = z.string().refine((valor) => valor === '' || esDiaReal(valor), { error: 'Ingresa una fecha válida.' })

/** «Hasta» no puede ser anterior a «Desde»; `YYYY-MM-DD` ordena igual como texto que como fecha */
function validarRango(valor: { desde: string; hasta: string }, ctx: z.RefinementCtx) {
  if (esDiaReal(valor.desde) && esDiaReal(valor.hasta) && valor.desde > valor.hasta) {
    ctx.addIssue({ code: 'custom', path: ['hasta'], message: 'La fecha «Hasta» no puede ser anterior a «Desde».' })
  }
}

/** Todos son opcionales y se combinan; vacío = sin filtro */
export const filtrosMovimientosSchema = z
  .object({
    tipoMovimiento: z.union([z.literal(''), z.enum(TIPOS_MOVIMIENTO)]),
    desde: fechaOpcional,
    hasta: fechaOpcional,
  })
  .superRefine(validarRango)

export type FiltrosMovimientos = z.output<typeof filtrosMovimientosSchema>

export const FILTROS_MOVIMIENTOS_VACIOS: FiltrosMovimientos = { tipoMovimiento: '', desde: '', hasta: '' }

export const hayFiltrosMovimientos = (filtros: FiltrosMovimientos) =>
  filtros.tipoMovimiento !== '' || filtros.desde !== '' || filtros.hasta !== ''

/** BOV-03 ordena por `fechaMovimiento`; sin `sort`, descendente */
export type DireccionOrden = 'asc' | 'desc'

export const ORDEN_INICIAL: DireccionOrden = 'desc'

/** Parámetros de BOV-03 sin filtros vacíos; el orden por defecto no se envía */
export function armarParametrosMovimientos(filtros: FiltrosMovimientos, orden: DireccionOrden, page: number) {
  const params: Record<string, string> = { page: String(page), pageSize: String(PAGE_SIZE) }
  if (filtros.tipoMovimiento) params.tipoMovimiento = filtros.tipoMovimiento
  if (filtros.desde) params.desde = filtros.desde
  if (filtros.hasta) params.hasta = filtros.hasta
  if (orden !== ORDEN_INICIAL) params.sort = `fechaMovimiento,${orden}`
  return params
}

/* ── BOV-07 · Arqueos ────────────────────────────────────────────────── */

export const filtrosArqueosSchema = z
  .object({
    estado: z.union([z.literal(''), z.enum(ESTADOS_ARQUEO)]),
    tipoArqueo: z.union([z.literal(''), z.enum(TIPOS_ARQUEO)]),
    desde: fechaOpcional,
    hasta: fechaOpcional,
  })
  .superRefine(validarRango)

export type FiltrosArqueos = z.output<typeof filtrosArqueosSchema>

export const FILTROS_ARQUEOS_VACIOS: FiltrosArqueos = { estado: '', tipoArqueo: '', desde: '', hasta: '' }

export const hayFiltrosArqueos = (filtros: FiltrosArqueos) => Object.values(filtros).some((valor) => valor !== '')

/** Parámetros de BOV-07 sin filtros vacíos */
export function armarParametrosArqueos(filtros: FiltrosArqueos, page: number) {
  const params: Record<string, string> = { page: String(page), pageSize: String(PAGE_SIZE) }
  for (const [clave, valor] of Object.entries(filtros)) if (valor) params[clave] = valor
  return params
}

/* ── SMV-02 · Solicitudes de movimiento ──────────────────────────────── */

/** `''` = todas, incluidas las solicitudes que esperan despacho o recepción */
export interface FiltrosSolicitudes {
  idAgencia: string
  estado: '' | (typeof ESTADOS_SOLICITUD)[number]
}

export const FILTROS_SOLICITUDES_INICIALES: FiltrosSolicitudes = { idAgencia: '', estado: '' }

/** Parámetros de SMV-02: solo los filtros con valor */
export function armarParametrosSolicitudes({ idAgencia, estado }: FiltrosSolicitudes, page: number, pageSize = PAGE_SIZE) {
  const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) }
  if (ID_AGENCIA_REGEX.test(idAgencia)) params.idAgencia = idAgencia
  if (estado) params.estado = estado
  return params
}

export const totalPaginas = (total: number, pageSize = PAGE_SIZE) => Math.max(1, Math.ceil(total / pageSize))

/** «Página 2 de 11 · 212 movimientos»; `cosa` en singular y plural */
export const resumenPaginacion = (page: number, total: number, pageSize = PAGE_SIZE, cosa: [string, string] = ['movimiento', 'movimientos']) =>
  `Página ${page} de ${totalPaginas(total, pageSize)} · ${total} ${total === 1 ? cosa[0] : cosa[1]}`

/** Mayor valor de una columna INT de SQL Server */
const INT_MAX = 2_147_483_647

/** Id de la URL o del buscador (bóveda, arqueo o solicitud): entero positivo que cabe en INT, o `null` (no se llama a la API) */
export function leerIdBoveda(valor: string | undefined) {
  const texto = valor?.trim()
  if (!texto || !/^\d+$/.test(texto)) return null
  const idBoveda = Number(texto)
  return idBoveda >= 1 && idBoveda <= INT_MAX ? idBoveda : null
}
