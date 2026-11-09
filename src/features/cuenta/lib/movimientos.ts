import { z } from 'zod'

import type { ApiError } from '@/shared/api'
import { TIPO_TRANSACCION_MAX, type Movimiento } from '@/features/cuenta/api/movimientos.contract'
import { PAGE_SIZE } from '@/features/cuenta/lib/filtros'
import { formatearMonto } from '@/features/cuenta/lib/formato'

/* Reglas de pantalla de los movimientos de una cuenta (A-07), sin UI para poder probarlas aparte */

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/

/** Días que abarca el rango inicial, contando hoy */
export const DIAS_RANGO_INICIAL = 30

const dos = (n: number) => String(n).padStart(2, '0')

/** `YYYY-MM-DD` con el día local: `toISOString()` usaría UTC y en Ecuador, de noche, ya sería mañana */
export const fechaLocal = (fecha: Date) => `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`

/** Últimos 30 días incluido hoy, en el calendario local (`new Date(y, m, d - n)` no se corre con el cambio de hora) */
export function rangoInicial(hoy = new Date()) {
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - (DIAS_RANGO_INICIAL - 1))
  return { desde: fechaLocal(inicio), hasta: fechaLocal(hoy) }
}

const esDiaReal = (valor: string) => {
  if (!FECHA_REGEX.test(valor)) return false
  const [anio, mes, dia] = valor.split('-').map(Number)
  const fecha = new Date(anio, mes - 1, dia)
  return fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia
}

const fecha = (obligatorio: string) =>
  z.string().refine(esDiaReal, { error: obligatorio, abort: true })

/** El backend exige las dos fechas y rechaza `desde > hasta` (400 RANGO_FECHAS_INVALIDO); aquí se evita la llamada */
export const filtrosMovimientosSchema = z
  .object({
    desde: fecha('Ingresa la fecha desde la que quieres consultar.'),
    hasta: fecha('Ingresa la fecha hasta la que quieres consultar.'),
    /** Texto libre y opcional: vacío = todos los tipos */
    tipoTransaccion: z
      .string()
      .trim()
      .max(TIPO_TRANSACCION_MAX, { error: `Usa ${TIPO_TRANSACCION_MAX} caracteres como máximo.` }),
  })
  .superRefine((valor, ctx) => {
    // `YYYY-MM-DD` ordena igual como texto que como fecha
    if (esDiaReal(valor.desde) && esDiaReal(valor.hasta) && valor.desde > valor.hasta) {
      ctx.addIssue({ code: 'custom', path: ['hasta'], message: 'La fecha «Hasta» no puede ser anterior a «Desde».' })
    }
  })

export type FiltrosMovimientosInput = z.input<typeof filtrosMovimientosSchema>
export type FiltrosMovimientos = z.output<typeof filtrosMovimientosSchema>

/** Los filtros con los que abre la pantalla */
export const filtrosMovimientosIniciales = (hoy = new Date()): FiltrosMovimientos => ({
  ...rangoInicial(hoy),
  tipoTransaccion: '',
})

/** Parámetros de CTA-06: el tipo vacío no se envía (el backend rechaza un texto de largo 0) */
export function armarParametrosMovimientos(filtros: FiltrosMovimientos, page: number) {
  const params: Record<string, string> = {
    desde: filtros.desde,
    hasta: filtros.hasta,
    page: String(page),
    pageSize: String(PAGE_SIZE),
  }
  const tipo = filtros.tipoTransaccion.trim()
  if (tipo) params.tipoTransaccion = tipo
  return params
}

export const textoNaturaleza = (tipoMovimiento: Movimiento['tipoMovimiento']) =>
  tipoMovimiento === 'D' ? 'Débito' : 'Crédito'

const FECHA_CONTABLE = new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeZone: 'UTC' })

/** «9 nov 2026». `YYYY-MM-DD` es un día, sin hora: se lee en UTC para que no se corra un día en Ecuador */
export function textoFechaContable(fechaContable: string) {
  const dia = new Date(`${fechaContable}T00:00:00Z`)
  return Number.isNaN(dia.getTime()) ? fechaContable : FECHA_CONTABLE.format(dia)
}

/** Una fila de la tabla ya lista para mostrar; sin comprobante se muestra un guion */
export function filaMovimiento(movimiento: Movimiento) {
  return {
    id: movimiento.idMovimiento,
    fecha: textoFechaContable(movimiento.fechaContable),
    tipo: movimiento.tipoTransaccion,
    naturaleza: textoNaturaleza(movimiento.tipoMovimiento),
    esDebito: movimiento.tipoMovimiento === 'D',
    monto: formatearMonto(movimiento.monto),
    saldoPosterior: formatearMonto(movimiento.saldoPosterior),
    comprobante: movimiento.numeroComprobante ?? '—',
  }
}

/** Errores de CTA-06 por `code`; los demás muestran el mensaje del backend */
const MENSAJES: Record<string, string> = {
  CUENTA_NO_ENCONTRADA: 'No existe una cuenta con ese ID.',
  RANGO_FECHAS_INVALIDO: 'La fecha «Desde» debe ser anterior o igual a «Hasta».',
  DATOS_INVALIDOS: 'Revisa las fechas y el tipo de transacción: hay valores que no son válidos.',
}

export const esCuentaInexistente = (error: ApiError) => error.status === 404 && error.code === 'CUENTA_NO_ENCONTRADA'

export function mensajeErrorMovimientos(error: ApiError) {
  if (error.status === 403) return 'No tienes permiso para ver los movimientos de esta cuenta.'
  return MENSAJES[error.code] ?? error.message
}
