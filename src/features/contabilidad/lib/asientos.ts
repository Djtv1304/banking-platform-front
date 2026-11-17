import type { ApiError } from '@/shared/api'
import type { Agencia } from '@/features/catalogos'
import {
  ASIENTOS_PAGE_SIZE,
  type Asiento,
  type CampoOrdenAsiento,
  type MovimientoAsiento,
} from '@/features/contabilidad/api/asientos.contract'
import { formatearSaldo } from '@/features/contabilidad/lib/cuenta-contable'
import { esNoDisponible } from '@/features/contabilidad/lib/mensajes'

/* Filtros, orden, paginación, cuadre y mensajes de la consulta de asientos (sin UI) */

export interface FiltrosAsientos {
  /** `YYYY-MM-DD` o vacío (todas las fechas) */
  fecha: string
  origen: string
  idAgencia: string
  estado: string
}

export const FILTROS_ASIENTOS_VACIOS: FiltrosAsientos = { fecha: '', origen: '', idAgencia: '', estado: '' }

export interface OrdenAsientos {
  campo: CampoOrdenAsiento
  direccion: 'asc' | 'desc'
}

/** El que usa el backend cuando no llega `sort` */
export const ORDEN_ASIENTOS_INICIAL: OrdenAsientos = { campo: 'fechaAsiento', direccion: 'desc' }

/** Un día calendario real en formato `YYYY-MM-DD` (el borrador a medias de FechaInput no lo es) */
export function esFechaIsoValida(valor: string) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor)
  if (!partes) return false
  const [anio, mes, dia] = [Number(partes[1]), Number(partes[2]), Number(partes[3])]
  const fecha = new Date(Date.UTC(anio, mes - 1, dia))
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia
}

/** Query params de CON-04: solo los filtros con valor; `sort` solo si cambia el orden de partida */
export function armarParametrosAsientos(filtros: FiltrosAsientos, page: number, orden: OrdenAsientos) {
  const params: Record<string, string> = { page: String(page), pageSize: String(ASIENTOS_PAGE_SIZE) }
  if (filtros.fecha) params.fecha = filtros.fecha
  if (filtros.origen) params.origen = filtros.origen
  if (filtros.idAgencia) params.idAgencia = filtros.idAgencia
  if (filtros.estado) params.estado = filtros.estado
  if (orden.campo !== ORDEN_ASIENTOS_INICIAL.campo || orden.direccion !== ORDEN_ASIENTOS_INICIAL.direccion) {
    params.sort = `${orden.campo},${orden.direccion}`
  }
  return params
}

/** Primer clic en una columna: ascendente (descendente en la fecha); otro clic en la misma: invierte */
export function alternarOrden(actual: OrdenAsientos, campo: CampoOrdenAsiento): OrdenAsientos {
  if (actual.campo === campo) return { campo, direccion: actual.direccion === 'asc' ? 'desc' : 'asc' }
  return { campo, direccion: campo === 'fechaAsiento' || campo === 'totalDebito' ? 'desc' : 'asc' }
}

export const totalPaginasAsientos = (total: number, pageSize = ASIENTOS_PAGE_SIZE) => Math.max(1, Math.ceil(total / pageSize))

/** «Página 2 de 3 · 45 asientos» */
export const resumenPaginacionAsientos = (page: number, total: number, pageSize = ASIENTOS_PAGE_SIZE) =>
  `Página ${page} de ${totalPaginasAsientos(total, pageSize)} · ${total} ${total === 1 ? 'asiento' : 'asientos'}`

type LineaMonto = Pick<MovimientoAsiento, 'tipoMovimiento' | 'monto'>

const aCentavos = (valor: number) => Math.round(valor * 100)

export interface TotalesAsiento {
  debitos: number
  creditos: number
  /** Débitos = créditos, comparados en centavos para no arrastrar error de coma flotante */
  cuadra: boolean
}

/** Suma las líneas por tipo de movimiento; un tipo desconocido no suma a ninguna columna */
export function totalesDeLineas(lineas: readonly LineaMonto[]): TotalesAsiento {
  let debitos = 0
  let creditos = 0
  for (const { tipoMovimiento, monto } of lineas) {
    const tipo = tipoMovimiento.trim().toUpperCase()
    if (tipo === 'DEBITO') debitos += aCentavos(monto)
    else if (tipo === 'CREDITO') creditos += aCentavos(monto)
  }
  return { debitos: debitos / 100, creditos: creditos / 100, cuadra: debitos === creditos }
}

/**
 * El asiento cuadra si sus líneas y su cabecera cuadran entre sí: débitos = créditos y las sumas de
 * las líneas coinciden con los totales de la cabecera.
 */
export function cuadreAsiento(asiento: Pick<Asiento, 'totalDebito' | 'totalCredito'> & { detalle: readonly LineaMonto[] }) {
  const lineas = totalesDeLineas(asiento.detalle)
  const cabeceraCuadra = aCentavos(asiento.totalDebito) === aCentavos(asiento.totalCredito)
  const lineasCoinciden =
    aCentavos(lineas.debitos) === aCentavos(asiento.totalDebito) &&
    aCentavos(lineas.creditos) === aCentavos(asiento.totalCredito)
  return { ...lineas, cuadra: lineas.cuadra && cabeceraCuadra && lineasCoinciden }
}

/** Por qué no cuadra un asiento, para el aviso del detalle; null si cuadra */
export function motivoDescuadre(asiento: Pick<Asiento, 'totalDebito' | 'totalCredito'> & { detalle: readonly LineaMonto[] }) {
  const cuadre = cuadreAsiento(asiento)
  if (cuadre.cuadra) return null
  if (!totalesDeLineas(asiento.detalle).cuadra) {
    return `Los débitos (${formatearSaldo(cuadre.debitos)}) y los créditos (${formatearSaldo(cuadre.creditos)}) de las líneas no son iguales.`
  }
  if (aCentavos(asiento.totalDebito) !== aCentavos(asiento.totalCredito)) {
    return `El total de débito (${formatearSaldo(asiento.totalDebito)}) y el de crédito (${formatearSaldo(asiento.totalCredito)}) de la cabecera no son iguales.`
  }
  return 'Las líneas no suman lo mismo que los totales de la cabecera.'
}

/** Código de cuenta y, si el plan ya está cargado, su nombre: «110105 · Caja general» */
export const etiquetaCuenta = (codigoCuenta: string, nombre: string | undefined) =>
  nombre ? `${codigoCuenta} · ${nombre}` : codigoCuenta

/** «2026-11-16» → «16/11/2026» sin pasar por Date (no hay zona horaria que lo corra un día) */
export function formatearFechaAsiento(iso: string) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : iso
}

/** «PENDIENTE_APROBACION» → «Pendiente aprobación»; un valor nuevo se muestra legible igual */
export function etiquetaTexto(valor: string) {
  const texto = valor.trim().toLowerCase().replaceAll('_', ' ')
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : '—'
}

/* Los valores llegan en mayúsculas y sin tilde: se muestran con la ortografía de la pantalla */
const ETIQUETAS_ESTADO: Record<string, string> = {
  BORRADOR: 'Borrador',
  PENDIENTE_APROBACION: 'Pendiente de aprobación',
  CONTABILIZADO: 'Contabilizado',
  REVERSADO: 'Reversado',
  ANULADO: 'Anulado',
}

const ETIQUETAS_ORIGEN: Record<string, string> = {
  ATM: 'ATM',
  BOVEDA: 'Bóveda',
  CREDITO: 'Crédito',
  NOMINA: 'Nómina',
}

export const etiquetaEstadoAsiento = (estado: string) => ETIQUETAS_ESTADO[estado.trim().toUpperCase()] ?? etiquetaTexto(estado)

export const etiquetaOrigenAsiento = (origen: string) => ETIQUETAS_ORIGEN[origen.trim().toUpperCase()] ?? etiquetaTexto(origen)

export type TonoEstadoAsiento = 'default' | 'secondary' | 'destructive' | 'outline'

/** Contabilizado en primario; anulado, en rojo; lo que aún no cuenta (o es nuevo), neutro */
export function tonoEstadoAsiento(estado: string): TonoEstadoAsiento {
  switch (estado.trim().toUpperCase()) {
    case 'CONTABILIZADO':
      return 'default'
    case 'ANULADO':
      return 'destructive'
    case 'REVERSADO':
      return 'secondary'
    default:
      return 'outline'
  }
}

export const esReversado = (asiento: Pick<Asiento, 'estado' | 'idAsientoReversion'>) =>
  asiento.idAsientoReversion !== null || asiento.estado.trim().toUpperCase() === 'REVERSADO'

/** «001 · Matriz»; hoy CAT-06 puede usar el código como nombre: entonces solo el código */
export const etiquetaAgencia = ({ idAgencia, nombre }: Pick<Agencia, 'idAgencia' | 'nombre'>) =>
  nombre && nombre !== idAgencia ? `${idAgencia} · ${nombre}` : idAgencia

export const MENSAJE_ASIENTOS_NO_DISPONIBLE = 'La consulta de asientos todavía no está disponible en el servidor.'

const MENSAJES: Record<string, string> = {
  FECHA_INVALIDA: 'La fecha no es válida. Revisa el día, el mes y el año.',
  ORDEN_INVALIDO: 'No se puede ordenar por esa columna.',
  PARAMETRO_INVALIDO: 'Uno de los filtros no es válido. Revísalos e inténtalo de nuevo.',
  ASIENTO_NO_ENCONTRADO: 'El asiento ya no existe. Vuelve a consultar la lista.',
}

export function mensajeErrorAsientos(error: ApiError) {
  if (esNoDisponible(error)) return MENSAJE_ASIENTOS_NO_DISPONIBLE
  if (error.status === 403) return 'Tu rol no tiene acceso a los asientos contables.'
  return MENSAJES[error.code] ?? error.message
}
