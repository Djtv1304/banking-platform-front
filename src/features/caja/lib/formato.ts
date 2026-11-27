import type { TonoInsignia } from '@/shared/ui'
import type { TipoMovimientoCaja } from '@/features/catalogos'
import type { CajaFisica, Dotacion, Jornada, MovimientoCaja } from '@/features/caja/api/caja.contract'

/* Cómo se muestran los datos de la ventanilla (sin UI, para poder probarlo aparte) */

const MONTO = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' })
/** La hora es la de la cooperativa (Ecuador), sin importar dónde esté el navegador */
const FECHA_HORA = new Intl.DateTimeFormat('es-EC', {
  dateStyle: 'medium',
  timeStyle: 'short',
  hourCycle: 'h23',
  timeZone: 'America/Guayaquil',
})

/** La cooperativa opera solo en USD: «$1.234,50» */
export const formatearMonto = (valor: number) => MONTO.format(valor)

/** «14 oct 2026, 17:15»; si no es una fecha válida se muestra tal cual */
export function formatearFechaHora(iso: string) {
  const fecha = new Date(iso)
  return Number.isNaN(fecha.getTime()) ? iso : FECHA_HORA.format(fecha)
}

export const ESTADO_JORNADA: Record<Jornada['estado'], { texto: string; tono: TonoInsignia }> = {
  ABIERTA: { texto: 'Abierta', tono: 'exito' },
  CERRADA: { texto: 'Cerrada', tono: 'neutro' },
  CANCELADA: { texto: 'Cancelada', tono: 'peligro' },
}

/** «CAJA-01» o, si el backend no trae código, «Ventanilla 7» */
export const nombreVentanilla = (caja: Pick<CajaFisica, 'idCajaFisica' | 'codigoCaja'>) =>
  caja.codigoCaja?.trim() || `Ventanilla ${caja.idCajaFisica}`

const TIPOS_DOTACION: Record<string, string> = { INICIAL: 'Inicial', ADICIONAL: 'Adicional' }
export const etiquetaTipoDotacion = (tipo: string | null | undefined) =>
  tipo ? (TIPOS_DOTACION[tipo.trim().toUpperCase()] ?? tipo) : 'Sin tipo'

/** Suma en centavos: 0,1 + 0,2 no debe dar 0,30000000000000004 */
export const totalDotado = (dotaciones: readonly Pick<Dotacion, 'monto'>[]) =>
  dotaciones.reduce((suma, { monto }) => suma + Math.round((monto ?? 0) * 100), 0) / 100

/** Ingreso (I) suma efectivo a la ventanilla, egreso (E) lo resta */
export function montoConSigno({ naturaleza, monto }: Pick<MovimientoCaja, 'naturaleza' | 'monto'>) {
  if (monto == null) return '—'
  const signo = naturaleza?.trim().toUpperCase() === 'E' ? '−' : naturaleza?.trim().toUpperCase() === 'I' ? '+' : ''
  return `${signo}${formatearMonto(monto)}`
}

/** Descripción del catálogo de tipos de movimiento de caja; si no está, el código tal cual */
export function etiquetaTipoMovimiento(movimiento: Pick<MovimientoCaja, 'idTipoMovimiento' | 'codigoTipoMovimiento'>, tipos: readonly TipoMovimientoCaja[]) {
  const tipo = tipos.find(
    (t) => t.idTipoMovimientoCaja === movimiento.idTipoMovimiento || (movimiento.codigoTipoMovimiento && t.codigo === movimiento.codigoTipoMovimiento),
  )
  return tipo?.descripcion ?? movimiento.codigoTipoMovimiento ?? 'Movimiento'
}
