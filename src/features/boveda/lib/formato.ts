import type { Agencia, Denominacion } from '@/features/catalogos'
import type { Boveda, DenominacionBoveda, MovimientoBoveda } from '@/features/boveda/api/bovedas.contract'

/* Cómo se muestran los datos de una bóveda (sin UI, para poder probarlo aparte) */

const MONTO = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' })
const CANTIDAD = new Intl.NumberFormat('es-EC')
/** La hora es la de la cooperativa (Ecuador), sin importar dónde esté el navegador */
const FECHA_HORA = new Intl.DateTimeFormat('es-EC', {
  dateStyle: 'medium',
  timeStyle: 'short',
  hourCycle: 'h23',
  timeZone: 'America/Guayaquil',
})

/** La cooperativa opera solo en USD: «$1.234,50» */
export const formatearMonto = (valor: number) => MONTO.format(valor)

/** «10.072» */
export const formatearCantidad = (valor: number) => CANTIDAD.format(valor)

/** «14 oct 2026, 17:15»; si no es una fecha válida se muestra tal cual */
export function formatearFechaHora(iso: string) {
  const fecha = new Date(iso)
  return Number.isNaN(fecha.getTime()) ? iso : FECHA_HORA.format(fecha)
}

/** Resta en centavos: 224218.48 − 224218.45 no debe dar 0.030000000001 */
const restar = (a: number, b: number) => Math.round((a - b) * 100) / 100

const ETIQUETAS_TIPO_BOVEDA: Record<string, string> = {
  General: 'Bóveda general',
  Mayor: 'Bóveda mayor',
  Menor: 'Bóveda menor',
}

export const etiquetaTipoBoveda = (tipo: string) => ETIQUETAS_TIPO_BOVEDA[tipo] ?? tipo

const ETIQUETAS_ESTADO: Record<string, string> = { A: 'Activa', I: 'Inactiva', C: 'Cerrada' }

export const etiquetaEstadoBoveda = (estado: string) => ETIQUETAS_ESTADO[estado.trim().toUpperCase()] ?? estado

export const estaActiva = (estado: string) => estado.trim().toUpperCase() === 'A'

/** «MATRIZ» o, si el catálogo no la trae, «Agencia 001» */
export function nombreAgencia(idAgencia: string | null, agencias: readonly Pick<Agencia, 'idAgencia' | 'nombre'>[]) {
  if (!idAgencia) return 'Sin agencia'
  const agencia = agencias.find((item) => item.idAgencia === idAgencia)
  return agencia && agencia.nombre !== idAgencia ? agencia.nombre : `Agencia ${idAgencia}`
}

export type NivelSaldo = 'bajo' | 'normal' | 'sobre'

type Limites = Pick<Boveda, 'saldoActual' | 'limiteMinimo' | 'limiteMaximo'>

/** Dónde está el saldo respecto de sus límites (los dos extremos cuentan como dentro) */
export function nivelSaldo({ saldoActual, limiteMinimo, limiteMaximo }: Limites): NivelSaldo {
  if (saldoActual < limiteMinimo) return 'bajo'
  if (saldoActual > limiteMaximo) return 'sobre'
  return 'normal'
}

/** Frase corta del estado del saldo, con el monto que falta o sobra */
export function textoNivel(limites: Limites) {
  const nivel = nivelSaldo(limites)
  if (nivel === 'bajo') return `Faltan ${formatearMonto(restar(limites.limiteMinimo, limites.saldoActual))} para el mínimo`
  if (nivel === 'sobre') return `Excede el máximo por ${formatearMonto(restar(limites.saldoActual, limites.limiteMaximo))}`
  return 'Dentro de los límites'
}

/** Cuánto efectivo más puede recibir antes de pasar el máximo (0 si ya lo pasó) */
export const cupoDisponible = ({ saldoActual, limiteMaximo }: Limites) => Math.max(0, restar(limiteMaximo, saldoActual))

/**
 * Posiciones (0–100) del saldo y de los límites sobre la barra. La escala deja un margen después
 * del máximo (o del saldo, si lo excede) para que el exceso se vea.
 */
export function posicionesBarra({ saldoActual, limiteMinimo, limiteMaximo }: Limites) {
  const escala = Math.max(limiteMaximo, saldoActual, 0) * 1.08 || 1
  const porcentaje = (valor: number) => Math.min(100, Math.max(0, (valor / escala) * 100))
  return { saldo: porcentaje(saldoActual), minimo: porcentaje(limiteMinimo), maximo: porcentaje(limiteMaximo) }
}

/** Diferencia entre el saldo y la suma de las denominaciones; 0 si cuadran */
export const descuadre = ({ saldoActual, totalDesglose }: Pick<Boveda, 'saldoActual' | 'totalDesglose'>) =>
  restar(totalDesglose, saldoActual)

/** «$20» o «25¢»: los valores bajo un dólar se leen mejor en centavos */
export function etiquetaValor(valor: number) {
  if (valor > 0 && valor < 1) return `${Math.round(valor * 100)}¢`
  return Number.isInteger(valor) ? `$${CANTIDAD.format(valor)}` : formatearMonto(valor)
}

export type TipoPieza = Denominacion['tipoPieza']

type Catalogo = readonly Pick<Denominacion, 'idDenominacion' | 'tipoPieza'>[]

/** Sin catálogo (aún cargando o caído) se asume que bajo un dólar es moneda */
const tipoPieza = (idDenominacion: number, valor: number, catalogo: Catalogo): TipoPieza =>
  catalogo.find((item) => item.idDenominacion === idDenominacion)?.tipoPieza ?? (valor < 1 ? 'Moneda' : 'Billete')

export interface Pieza {
  idDenominacion: number
  valor: number
  cantidad: number
  subtotal: number
  /** Parte del efectivo total de la bóveda (0–100) */
  porcentaje: number
}

export interface GrupoPiezas {
  tipo: TipoPieza
  piezas: Pieza[]
  cantidad: number
  subtotal: number
}

/** Billetes y monedas por separado, de mayor a menor valor; un grupo sin piezas no se devuelve */
export function agruparDenominaciones(denominaciones: readonly DenominacionBoveda[], catalogo: Catalogo): GrupoPiezas[] {
  const total = denominaciones.reduce((suma, item) => suma + item.subtotal, 0)
  return (['Billete', 'Moneda'] as const)
    .map((tipo) => {
      const piezas = denominaciones
        .filter((item) => tipoPieza(item.idDenominacion, item.valor, catalogo) === tipo)
        .sort((a, b) => b.valor - a.valor)
        .map((item) => ({
          idDenominacion: item.idDenominacion,
          valor: item.valor,
          cantidad: item.cantidadActual,
          subtotal: item.subtotal,
          porcentaje: total > 0 ? (item.subtotal / total) * 100 : 0,
        }))
      return {
        tipo,
        piezas,
        cantidad: piezas.reduce((suma, pieza) => suma + pieza.cantidad, 0),
        subtotal: Math.round(piezas.reduce((suma, pieza) => suma + pieza.subtotal, 0) * 100) / 100,
      }
    })
    .filter((grupo) => grupo.piezas.length > 0)
}

const ETIQUETAS_MOVIMIENTO: Record<string, string> = {
  Traslado: 'Traslado entre bóvedas',
  ProvisionExterna: 'Provisión externa',
  EnvioExcedente: 'Envío de excedente',
  AjusteFaltante: 'Ajuste por faltante',
  AjusteSobrante: 'Ajuste por sobrante',
  DotacionCaja: 'Dotación a caja',
  DevolucionCaja: 'Devolución de caja',
  AbastecimientoATM: 'Abastecimiento de ATM',
  RemanenteATM: 'Remanente de ATM',
  RetornoRemesa: 'Retorno de remesa',
  ReposicionFaltante: 'Reposición de faltante',
}

/** Un tipo que la SPA no conoce se muestra separando sus palabras: «NuevoTipo» → «Nuevo tipo» */
export function etiquetaMovimiento(tipo: string) {
  const conocida = ETIQUETAS_MOVIMIENTO[tipo]
  if (conocida) return conocida
  const palabras = tipo.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
  return palabras.charAt(0).toUpperCase() + palabras.slice(1)
}

/** «+$2.200,00» si ingresa a la bóveda, «−$1.000,00» si egresa */
export const montoConSigno = ({ naturaleza, monto }: Pick<MovimientoBoveda, 'naturaleza' | 'monto'>) =>
  `${naturaleza === 'I' ? '+' : '−'}${formatearMonto(monto)}`

/** Valor de cada denominación por su id, para leer el desglose de un movimiento */
export function valoresPorDenominacion(...fuentes: readonly (readonly { idDenominacion: number; valor: number }[])[]) {
  const valores = new Map<number, number>()
  for (const fuente of fuentes) for (const item of fuente) valores.set(item.idDenominacion, item.valor)
  return valores
}

/** «60 × $20» por cada denominación, de mayor a menor valor; sin valor conocido, «60 piezas (den. 4)» */
export function piezasDelMovimiento(desglose: MovimientoBoveda['desglose'], valores: ReadonlyMap<number, number>) {
  return [...desglose]
    .sort((a, b) => (valores.get(b.idDenominacion) ?? 0) - (valores.get(a.idDenominacion) ?? 0))
    .map(({ idDenominacion, cantidad }) => {
      const valor = valores.get(idDenominacion)
      return {
        idDenominacion,
        texto:
          valor === undefined
            ? `${formatearCantidad(cantidad)} piezas (den. ${idDenominacion})`
            : `${formatearCantidad(cantidad)} × ${etiquetaValor(valor)}`,
      }
    })
}
