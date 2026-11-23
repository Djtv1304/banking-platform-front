/**
 * E4-04 · Lógica de la grilla de líneas de un asiento manual, sin React para poder probarla.
 *
 * Cada línea tiene una cuenta y un monto en el debe o en el haber (nunca en los dos). Las líneas
 * totalmente vacías no cuentan: no son error ni viajan al backend.
 */
import type { CuentaContable } from '@/features/contabilidad/api/contabilidad.contract'
import { estaActiva } from '@/features/contabilidad/lib/cuenta-contable'
import { centavosDeTexto, dolaresDeCentavos, formatearCentavos, formatearDolares } from '@/shared/lib/monto'

export interface LineaBorrador {
  /** Estable mientras la línea existe: sirve de `key` y para mover el foco */
  clave: string
  /** Lo escrito en el campo: «110105» o la opción elegida «110105 · Caja general» */
  cuenta: string
  debe: string
  haber: string
}

export type CampoLinea = 'cuenta' | 'debe' | 'haber'

export const MINIMO_LINEAS = 2

let secuencia = 0
export const lineaVacia = (): LineaBorrador => ({ clave: `linea-${++secuencia}`, cuenta: '', debe: '', haber: '' })
export const grillaInicial = (): LineaBorrador[] => Array.from({ length: MINIMO_LINEAS }, lineaVacia)

export type AccionGrilla =
  /** La línea nueva la crea quien despacha, para saber su clave y llevarle el foco */
  | { tipo: 'agregar'; linea: LineaBorrador; despuesDe?: string }
  | { tipo: 'quitar'; clave: string }
  | { tipo: 'cambiar'; clave: string; campo: CampoLinea; valor: string }
  /** Cargar un borrador guardado o volver a empezar */
  | { tipo: 'reemplazar'; lineas: LineaBorrador[] }

export function reducirGrilla(lineas: LineaBorrador[], accion: AccionGrilla): LineaBorrador[] {
  switch (accion.tipo) {
    case 'agregar': {
      const indice = accion.despuesDe ? lineas.findIndex(l => l.clave === accion.despuesDe) : -1
      if (indice < 0) return [...lineas, accion.linea]
      return [...lineas.slice(0, indice + 1), accion.linea, ...lineas.slice(indice + 1)]
    }
    case 'quitar':
      // Un asiento necesita al menos dos líneas: por debajo de eso no se quita ninguna
      if (lineas.length <= MINIMO_LINEAS) return lineas
      return lineas.filter(l => l.clave !== accion.clave)
    case 'cambiar':
      return lineas.map(l => (l.clave === accion.clave ? { ...l, [accion.campo]: accion.valor } : l))
    case 'reemplazar':
      return accion.lineas.length >= MINIMO_LINEAS
        ? accion.lineas
        : [...accion.lineas, ...Array.from({ length: MINIMO_LINEAS - accion.lineas.length }, lineaVacia)]
  }
}

/** Clave de la línea que recibe el foco al quitar `clave`: la siguiente, o la anterior si era la última */
export function focoTrasQuitar(lineas: readonly LineaBorrador[], clave: string): string | null {
  const indice = lineas.findIndex(l => l.clave === clave)
  if (indice < 0 || lineas.length <= MINIMO_LINEAS) return null
  return (lineas[indice + 1] ?? lineas[indice - 1]).clave
}

/** Id del control de una celda, para `htmlFor`, `aria-describedby` y el foco */
export const idCelda = (idGrilla: string, clave: string, campo: CampoLinea | 'error' | 'nombre') => `${idGrilla}-${clave}-${campo}`

// ── Cuentas ──────────────────────────────────────────────────────────────

/** Cuentas que pueden recibir un asiento manual: auxiliares, activas y no reservadas a lo automático */
export const cuentasElegibles = (plan: readonly CuentaContable[]) =>
  plan
    .filter(c => c.esImputable && estaActiva(c) && !c.soloAutomatica)
    .sort((a, b) => a.codigoCuenta.localeCompare(b.codigoCuenta))

export const opcionCuenta = (cuenta: Pick<CuentaContable, 'codigoCuenta' | 'nombreCuenta'>) =>
  `${cuenta.codigoCuenta} · ${cuenta.nombreCuenta}`

export type IndiceCuentas = ReadonlyMap<string, CuentaContable>

/** Todo el plan por código: también las de grupo e inactivas, para explicar por qué no sirven */
export const indiceDeCuentas = (plan: readonly CuentaContable[]): IndiceCuentas =>
  new Map(plan.map(c => [c.codigoCuenta, c]))

/** El código es lo primero que se escribe: «110105», «110105 · Caja» o «110105 Caja» */
export const codigoDeTexto = (texto: string) => texto.trim().split(/[\s·]+/)[0] ?? ''

export const cuentaDeTexto = (texto: string, indice: IndiceCuentas) => indice.get(codigoDeTexto(texto))

// ── Validación ───────────────────────────────────────────────────────────

export interface ErroresLinea {
  cuenta?: string
  monto?: string
}

export const MENSAJES_GRILLA = {
  cuentaVacia: 'Elige la cuenta.',
  cuentaInexistente: (codigo: string) => `No hay una cuenta con el código ${codigo}.`,
  cuentaDeGrupo: (codigo: string) => `La ${codigo} es una cuenta de grupo: elige una cuenta auxiliar.`,
  cuentaInactiva: (codigo: string) => `La cuenta ${codigo} está inactiva.`,
  cuentaSoloAutomatica: (codigo: string) => `La cuenta ${codigo} sólo recibe asientos automáticos.`,
  montoVacio: 'Escribe el monto en el debe o en el haber.',
  montoEnAmbos: 'Usa una sola columna: el debe o el haber.',
  montoInvalido: 'Monto no válido: hasta dos decimales, por ejemplo 1.250,50.',
  montoCero: 'El monto debe ser mayor que cero.',
} as const

export const esLineaVacia = (linea: LineaBorrador) => !linea.cuenta.trim() && !linea.debe.trim() && !linea.haber.trim()

function errorCuenta(texto: string, indice: IndiceCuentas): string | undefined {
  const codigo = codigoDeTexto(texto)
  if (!codigo) return MENSAJES_GRILLA.cuentaVacia
  const cuenta = indice.get(codigo)
  if (!cuenta) return MENSAJES_GRILLA.cuentaInexistente(codigo)
  if (!cuenta.esImputable) return MENSAJES_GRILLA.cuentaDeGrupo(codigo)
  if (!estaActiva(cuenta)) return MENSAJES_GRILLA.cuentaInactiva(codigo)
  if (cuenta.soloAutomatica) return MENSAJES_GRILLA.cuentaSoloAutomatica(codigo)
  return undefined
}

function errorMonto({ debe, haber }: LineaBorrador): string | undefined {
  const conDebe = debe.trim() !== ''
  const conHaber = haber.trim() !== ''
  if (!conDebe && !conHaber) return MENSAJES_GRILLA.montoVacio
  if (conDebe && conHaber) return MENSAJES_GRILLA.montoEnAmbos
  const centavos = centavosDeTexto(conDebe ? debe : haber)
  if (centavos === null) return MENSAJES_GRILLA.montoInvalido
  if (centavos === 0) return MENSAJES_GRILLA.montoCero
  return undefined
}

/** Errores de una línea; una línea vacía no tiene */
export function erroresDeLinea(linea: LineaBorrador, indice: IndiceCuentas): ErroresLinea {
  if (esLineaVacia(linea)) return {}
  const errores: ErroresLinea = {}
  const cuenta = errorCuenta(linea.cuenta, indice)
  const monto = errorMonto(linea)
  if (cuenta) errores.cuenta = cuenta
  if (monto) errores.monto = monto
  return errores
}

// ── Totales y envío ──────────────────────────────────────────────────────

export interface TotalesGrilla {
  /** En centavos; un monto inválido no suma */
  debe: number
  haber: number
  /** debe − haber */
  diferencia: number
  cuadra: boolean
}

export function totalesDeGrilla(lineas: readonly LineaBorrador[]): TotalesGrilla {
  let debe = 0
  let haber = 0
  for (const linea of lineas) {
    debe += centavosDeTexto(linea.debe) ?? 0
    haber += centavosDeTexto(linea.haber) ?? 0
  }
  return { debe, haber, diferencia: debe - haber, cuadra: debe === haber && debe > 0 }
}

/** Frase del cuadre para la barra de totales (se anuncia con aria-live) */
export function estadoCuadre({ debe, haber, diferencia, cuadra }: TotalesGrilla) {
  if (debe === 0 && haber === 0) return 'Escribe los montos de las líneas.'
  if (cuadra) return 'El asiento cuadra.'
  const falta = formatearDolares(Math.abs(diferencia))
  return diferencia > 0 ? `Faltan ${falta} en el haber.` : `Faltan ${falta} en el debe.`
}

export const MOTIVOS_NO_ENVIAR = {
  pocasLineas: 'El asiento necesita al menos dos líneas.',
  conErrores: 'Corrige las líneas marcadas.',
  noCuadra: 'El debe y el haber deben sumar lo mismo.',
} as const

export interface ResumenGrilla {
  totales: TotalesGrilla
  errores: ReadonlyMap<string, ErroresLinea>
  /** Las que tienen algo escrito */
  utiles: number
  /** Vacío si se puede guardar o enviar */
  motivoNoEnviar: string
  puedeEnviar: boolean
}

export function resumenGrilla(lineas: readonly LineaBorrador[], indice: IndiceCuentas): ResumenGrilla {
  const errores = new Map<string, ErroresLinea>()
  let utiles = 0
  let conErrores = false
  for (const linea of lineas) {
    if (esLineaVacia(linea)) continue
    utiles++
    const de = erroresDeLinea(linea, indice)
    if (de.cuenta || de.monto) {
      errores.set(linea.clave, de)
      conErrores = true
    }
  }
  const totales = totalesDeGrilla(lineas)
  const motivoNoEnviar =
    utiles < MINIMO_LINEAS
      ? MOTIVOS_NO_ENVIAR.pocasLineas
      : conErrores
        ? MOTIVOS_NO_ENVIAR.conErrores
        : !totales.cuadra
          ? MOTIVOS_NO_ENVIAR.noCuadra
          : ''
  return { totales, errores, utiles, motivoNoEnviar, puedeEnviar: motivoNoEnviar === '' }
}

/** Línea tal como la propone el front para POST/PUT /contabilidad/asientos (E4-04) */
export interface LineaAsientoPropuesta {
  idCuentaContable: number
  tipoMovimiento: 'DEBITO' | 'CREDITO'
  /** Dólares con dos decimales */
  monto: number
}

function aPropuesta(lineas: readonly LineaBorrador[], indice: IndiceCuentas): LineaAsientoPropuesta[] {
  return lineas
    .filter(l => !esLineaVacia(l))
    .map(l => {
      const cuenta = cuentaDeTexto(l.cuenta, indice)!
      const enDebe = l.debe.trim() !== ''
      return {
        idCuentaContable: cuenta.idCuentaContable,
        tipoMovimiento: enDebe ? 'DEBITO' : 'CREDITO',
        monto: dolaresDeCentavos(centavosDeTexto(enDebe ? l.debe : l.haber)!),
      }
    })
}

/** Las líneas útiles listas para enviar; `null` si la grilla todavía no se puede enviar */
export function lineasParaEnviar(lineas: readonly LineaBorrador[], indice: IndiceCuentas): LineaAsientoPropuesta[] | null {
  return resumenGrilla(lineas, indice).puedeEnviar ? aPropuesta(lineas, indice) : null
}

/**
 * Para guardar un borrador basta con que lo escrito sea válido: puede no cuadrar todavía.
 * `null` si hay líneas con errores o ninguna línea útil.
 */
export function lineasParaBorrador(lineas: readonly LineaBorrador[], indice: IndiceCuentas): LineaAsientoPropuesta[] | null {
  const { errores, utiles } = resumenGrilla(lineas, indice)
  return errores.size === 0 && utiles > 0 ? aPropuesta(lineas, indice) : null
}

/** Al revés: las líneas de un borrador guardado, para seguir editándolo */
export function lineasDeAsiento(
  detalle: readonly { codigoCuenta: string; tipoMovimiento: string; monto: number }[],
  indice: IndiceCuentas,
): LineaBorrador[] {
  return detalle.map(m => {
    const cuenta = indice.get(m.codigoCuenta)
    const monto = formatearCentavos(Math.round(m.monto * 100))
    const enDebe = m.tipoMovimiento.trim().toUpperCase() === 'DEBITO'
    return {
      ...lineaVacia(),
      cuenta: cuenta ? opcionCuenta(cuenta) : m.codigoCuenta,
      debe: enDebe ? monto : '',
      haber: enDebe ? '' : monto,
    }
  })
}
