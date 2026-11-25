import type { ApiError } from '@/shared/api'
import type { FechaContable } from '@/features/contabilidad/api/fecha-contable.contract'

/* Lógica pura de la fecha contable (E4-05). Las fechas viajan como texto `YYYY-MM-DD`: se calculan
 * y se formatean siempre en UTC, así la zona horaria del navegador nunca corre un día. */

const PARTES_ISO = /^(\d{4})-(\d{2})-(\d{2})$/

/** `YYYY-MM-DD` → instante a medianoche UTC; `null` si no es un día calendario real */
function aUtc(iso: string) {
  const partes = PARTES_ISO.exec(iso)
  if (!partes) return null
  const [anio, mes, dia] = [Number(partes[1]), Number(partes[2]), Number(partes[3])]
  const fecha = new Date(Date.UTC(anio, mes - 1, dia))
  const real = fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia
  return real ? fecha : null
}

/** Suma `dias` días calendario a una fecha ISO (cruza meses y años); fecha inválida → `null` */
export function sumarDias(iso: string, dias: number) {
  const base = aUtc(iso)
  if (!base) return null
  base.setUTCDate(base.getUTCDate() + dias)
  return base.toISOString().slice(0, 10)
}

/** Los `cantidad` días calendario que siguen a `iso`, sin incluirlo */
export function diasSiguientes(iso: string, cantidad = 7) {
  const dias: string[] = []
  for (let i = 1; i <= cantidad; i++) {
    const dia = sumarDias(iso, i)
    if (dia) dias.push(dia)
  }
  return dias
}

const formatoLargo = new Intl.DateTimeFormat('es-EC', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const formatoCorto = new Intl.DateTimeFormat('es-EC', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' })

/** «martes, 17 de noviembre de 2026» */
export function formatearFechaLarga(iso: string) {
  const fecha = aUtc(iso)
  return fecha ? formatoLargo.format(fecha) : iso
}

/** «mar, 17 nov» */
export function formatearFechaCorta(iso: string) {
  const fecha = aUtc(iso)
  return fecha ? formatoCorto.format(fecha) : iso
}

/** `19:00:00` → `19:00` */
export function formatearHoraCorte(hora: string) {
  return /^\d{2}:\d{2}/.test(hora) ? hora.slice(0, 5) : hora
}

export const textoCorte = (horaCorte: string) =>
  `Lo que se registre después de las ${formatearHoraCorte(horaCorte)} se fecha el siguiente día hábil.`

export type TipoDia = 'habil' | 'feriado' | 'fin-de-semana' | 'no-contable'

/** Hábil si es día contable; si no, el motivo: feriado, fin de semana o simplemente no contable */
export function tipoDia(fecha: Pick<FechaContable, 'esDiaContable' | 'esFeriado' | 'esFinDeSemana'>): TipoDia {
  if (fecha.esDiaContable) return 'habil'
  if (fecha.esFeriado) return 'feriado'
  if (fecha.esFinDeSemana) return 'fin-de-semana'
  return 'no-contable'
}

export const ETIQUETA_TIPO_DIA: Record<TipoDia, string> = {
  habil: 'Hábil',
  feriado: 'Feriado',
  'fin-de-semana': 'Fin de semana',
  'no-contable': 'No contable',
}

/** Variante del `Badge` de cada tipo de día */
export const VARIANTE_TIPO_DIA: Record<TipoDia, 'default' | 'secondary' | 'outline'> = {
  habil: 'default',
  feriado: 'secondary',
  'fin-de-semana': 'secondary',
  'no-contable': 'outline',
}

export const etiquetaEstadoDia = (fecha: Pick<FechaContable, 'esDiaContable'>) =>
  fecha.esDiaContable ? 'Día contable' : 'No contable'

/** 404 con `code` propio = la fecha no está en el calendario; un 404 genérico (http_404) es otra cosa */
export const esFechaFueraDelCalendario = (error: ApiError) => error.status === 404 && !/^http_\d+$/i.test(error.code)

export const MENSAJE_FECHA_SIN_CALENDARIO =
  'Esa fecha no está en el calendario contable: no se puede operar en ella hasta generarlo.'

/** 500 CALENDARIO_SIN_FECHA: el calendario no tiene fechas cargadas para el período (CON-02) */
export const MENSAJE_CALENDARIO_SIN_FECHAS =
  'El calendario contable no tiene fechas cargadas para este período. Hay que generarlo antes de operar.'

/** Mensaje de error al consultar una fecha del calendario */
export function mensajeErrorFechaContable(error: ApiError) {
  if (esFechaFueraDelCalendario(error)) return MENSAJE_FECHA_SIN_CALENDARIO
  if (error.status === 400) return 'La fecha no es válida. Revisa el día, el mes y el año.'
  if (error.status === 403) return 'Tu rol no tiene acceso a la fecha contable.'
  if (error.code === 'CALENDARIO_SIN_FECHA') return MENSAJE_CALENDARIO_SIN_FECHAS
  return error.message
}
