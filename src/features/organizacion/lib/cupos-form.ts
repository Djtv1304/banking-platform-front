import type {
  CupoCanal,
  CupoCanalBody,
  Restricciones,
  RestriccionesBody,
} from '@/features/organizacion/api/productos.contract'

/*
 * Cupos por canal y restricciones de un subproducto: mismas reglas que el backend
 * (CK_ProductoCanalCupo_*: diario > 0, mensual ≥ diario, 0 < por transacción ≤ diario, número > 0).
 */

export interface CupoEntrada {
  idCanal: number
  habilitado: boolean
  cupoDiarioMaximo: string
  cupoMensualMaximo: string
  montoMaxTransaccion: string
  maxTransaccionesDia: string
}

export type CampoCupo = Exclude<keyof CupoEntrada, 'idCanal' | 'habilitado'>

const MONTO = /^\d{1,16}(\.\d{1,2})?$/
const texto = (v: number | null | undefined) => (v == null ? '' : String(v))

export const entradasCupos = (cupos: readonly CupoCanal[]): CupoEntrada[] =>
  cupos.map((c) => ({
    idCanal: c.idCanal,
    habilitado: c.habilitado,
    cupoDiarioMaximo: texto(c.cupoDiarioMaximo),
    cupoMensualMaximo: texto(c.cupoMensualMaximo),
    montoMaxTransaccion: texto(c.montoMaxTransaccion),
    maxTransaccionesDia: texto(c.maxTransaccionesDia),
  }))

/** Solo los canales marcados van en el body; devuelve los errores por canal y campo */
export function cuposBody(entradas: readonly CupoEntrada[]):
  | { body: CupoCanalBody[] }
  | { errores: Record<number, Partial<Record<CampoCupo, string>>> } {
  const body: CupoCanalBody[] = []
  const errores: Record<number, Partial<Record<CampoCupo, string>>> = {}
  for (const e of entradas.filter((x) => x.habilitado)) {
    const err: Partial<Record<CampoCupo, string>> = {}
    const monto = (campo: Exclude<CampoCupo, 'maxTransaccionesDia'>) => {
      const v = e[campo].trim()
      if (!MONTO.test(v) || Number(v) <= 0) err[campo] = 'Monto mayor que 0, p. ej. 500 o 500.50.'
      return Number(v)
    }
    const diario = monto('cupoDiarioMaximo')
    const mensual = monto('cupoMensualMaximo')
    const porTx = monto('montoMaxTransaccion')
    const numero = e.maxTransaccionesDia.trim()
    if (!/^\d{1,5}$/.test(numero) || Number(numero) < 1) err.maxTransaccionesDia = 'Número entero mayor que 0.'
    if (!err.cupoMensualMaximo && !err.cupoDiarioMaximo && mensual < diario) err.cupoMensualMaximo = 'Debe ser mayor o igual que el diario.'
    if (!err.montoMaxTransaccion && !err.cupoDiarioMaximo && porTx > diario) err.montoMaxTransaccion = 'No puede superar el cupo diario.'
    if (Object.keys(err).length > 0) errores[e.idCanal] = err
    else
      body.push({
        idCanal: e.idCanal,
        cupoDiarioMaximo: diario,
        cupoMensualMaximo: mensual,
        montoMaxTransaccion: porTx,
        maxTransaccionesDia: Number(numero),
      })
  }
  return Object.keys(errores).length > 0 ? { errores } : { body }
}

export interface RestriccionesEntrada {
  diasSinRetiros: string
  saldoMinimo: string
}

export const entradasRestricciones = (r: Restricciones): RestriccionesEntrada => ({
  diasSinRetiros: texto(r.diasSinRetiros),
  saldoMinimo: texto(r.saldoMinimo),
})

/** Vacío = sin esa restricción */
export function restriccionesBody(
  e: RestriccionesEntrada,
): { body: RestriccionesBody } | { errores: Partial<Record<keyof RestriccionesEntrada, string>> } {
  const errores: Partial<Record<keyof RestriccionesEntrada, string>> = {}
  const dias = e.diasSinRetiros.trim()
  const saldo = e.saldoMinimo.trim()
  if (dias && (!/^\d{1,4}$/.test(dias) || Number(dias) < 1 || Number(dias) > 3650)) errores.diasSinRetiros = 'Entre 1 y 3650 días.'
  if (saldo && (!MONTO.test(saldo) || Number(saldo) <= 0)) errores.saldoMinimo = 'Monto mayor que 0, p. ej. 100.'
  if (Object.keys(errores).length > 0) return { errores }
  return { body: { diasSinRetiros: dias ? Number(dias) : null, saldoMinimo: saldo ? Number(saldo) : null } }
}
