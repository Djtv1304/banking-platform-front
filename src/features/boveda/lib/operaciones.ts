import { z } from 'zod'

import {
  INT_MAX,
  OBSERVACIONES_MAX,
  TIPOS_ARQUEO,
  TIPOS_MOVIMIENTO,
  type Arqueo,
  type CrearSolicitudMovimiento,
  type DenominacionBoveda,
  type PiezaDesglose,
  type RegistrarArqueo,
  type TipoMovimientoBoveda,
} from '@/features/boveda/api/bovedas.contract'
import { formatearMonto } from '@/features/boveda/lib/formato'

/* Reglas de los formularios de SMV-01, BOV-05 y BOV-06, sin UI para poder probarlas aparte */

export type Naturaleza = 'I' | 'E'

/**
 * Si el efectivo entra (I) o sale (E) de la bóveda en que se registra. Coincide con lo que devuelve
 * BOV-03 para cajas y ATM. TODO(API): confirmar el traslado (se asume que sale hacia la contraparte)
 * y los ajustes.
 */
export const NATURALEZA_MOVIMIENTO: Record<TipoMovimientoBoveda, Naturaleza> = {
  ProvisionExterna: 'I',
  DevolucionCaja: 'I',
  RemanenteATM: 'I',
  AjusteSobrante: 'I',
  Traslado: 'E',
  EnvioExcedente: 'E',
  DotacionCaja: 'E',
  AbastecimientoATM: 'E',
  AjusteFaltante: 'E',
}

/** Opciones del tipo de movimiento agrupadas como las piensa quien opera */
export const GRUPOS_MOVIMIENTO: { titulo: string; tipos: TipoMovimientoBoveda[] }[] = [
  { titulo: 'Ingresa efectivo', tipos: ['ProvisionExterna', 'DevolucionCaja', 'RemanenteATM'] },
  { titulo: 'Sale efectivo', tipos: ['DotacionCaja', 'AbastecimientoATM', 'EnvioExcedente'] },
  { titulo: 'Entre bóvedas', tipos: ['Traslado'] },
  { titulo: 'Ajustes', tipos: ['AjusteSobrante', 'AjusteFaltante'] },
]

/** Solo el traslado pide la bóveda contraparte. TODO(API): confirmar si el envío de excedente también */
export const pideContraparte = (tipo: string) => tipo === 'Traslado'

/* ── Cantidades por denominación ─────────────────────────────────────── */

/** Las claves de React Hook Form no pueden ser números (los trata como índices de un arreglo) */
export const claveDenominacion = (idDenominacion: number) => `d${idDenominacion}`

export type Cantidades = Record<string, string>

/** «1.250» o «1250» → 1250; vacío → 0; cualquier otra cosa → null */
export function leerCantidad(texto: string | undefined) {
  const limpio = (texto ?? '').trim().replace(/[.\s]/g, '')
  if (limpio === '') return 0
  if (!/^\d+$/.test(limpio)) return null
  const cantidad = Number(limpio)
  return cantidad <= INT_MAX ? cantidad : null
}

/** Las piezas con cantidad, ordenadas por denominación: el desglose que espera el backend */
export function armarDesglose(cantidades: Cantidades): PiezaDesglose[] {
  return Object.entries(cantidades)
    .map(([clave, texto]) => ({ idDenominacion: Number(clave.slice(1)), cantidad: leerCantidad(texto) ?? 0 }))
    .filter((pieza) => Number.isInteger(pieza.idDenominacion) && pieza.idDenominacion > 0 && pieza.cantidad > 0)
    .sort((a, b) => a.idDenominacion - b.idDenominacion)
}

/** Total del desglose en dólares, sumado en centavos para no arrastrar errores de coma flotante */
export function totalDesglose(desglose: readonly PiezaDesglose[], valores: ReadonlyMap<number, number>) {
  const centavos = desglose.reduce(
    (suma, pieza) => suma + pieza.cantidad * Math.round((valores.get(pieza.idDenominacion) ?? 0) * 100),
    0,
  )
  return centavos / 100
}

/** Denominaciones de un egreso que piden más piezas de las que hay en la bóveda */
export function piezasInsuficientes(desglose: readonly PiezaDesglose[], enBoveda: readonly DenominacionBoveda[]) {
  return desglose.flatMap((pieza) => {
    const disponible = enBoveda.find((item) => item.idDenominacion === pieza.idDenominacion)?.cantidadActual ?? 0
    return pieza.cantidad > disponible ? [{ idDenominacion: pieza.idDenominacion, pedida: pieza.cantidad, disponible }] : []
  })
}

/** Saldo de la bóveda después del movimiento (o cuando se apruebe la solicitud) */
export const saldoResultante = (saldo: number, total: number, naturaleza: Naturaleza) =>
  Math.round((naturaleza === 'I' ? saldo + total : saldo - total) * 100) / 100

const cantidadesSchema = z.record(z.string(), z.string())

/** Errores de las cantidades: una mal escrita o ninguna con piezas */
function validarCantidades(cantidades: Cantidades, ctx: z.RefinementCtx, vacio: string) {
  let invalida = false
  for (const [clave, texto] of Object.entries(cantidades)) {
    if (leerCantidad(texto) === null) {
      invalida = true
      ctx.addIssue({ code: 'custom', path: ['cantidades', clave], message: 'Solo números enteros.' })
    }
  }
  if (!invalida && armarDesglose(cantidades).length === 0) {
    ctx.addIssue({ code: 'custom', path: ['cantidades'], message: vacio })
  }
}

const observaciones = z
  .string()
  .trim()
  .max(OBSERVACIONES_MAX, `Usa hasta ${OBSERVACIONES_MAX} caracteres.`)
  .transform((valor) => valor || undefined)

/* ── SMV-01 · Solicitar movimiento ───────────────────────────────────── */

export interface MovimientoForm {
  tipoMovimiento: '' | TipoMovimientoBoveda
  idBovedaContraparte: string
  observaciones: string
  cantidades: Cantidades
}

export const MOVIMIENTO_VACIO: MovimientoForm = {
  tipoMovimiento: '',
  idBovedaContraparte: '',
  observaciones: '',
  cantidades: {},
}

/** El formulario ya convertido en el body de SMV-01 */
export const movimientoFormSchema = (idBoveda: number) =>
  z
    .object({
      tipoMovimiento: z.union([z.literal(''), z.enum(TIPOS_MOVIMIENTO)]),
      idBovedaContraparte: z.string(),
      observaciones,
      cantidades: cantidadesSchema,
    })
    .superRefine((valor, ctx) => {
      if (!valor.tipoMovimiento) ctx.addIssue({ code: 'custom', path: ['tipoMovimiento'], message: 'Elige el tipo de movimiento.' })
      if (pideContraparte(valor.tipoMovimiento)) {
        const contraparte = leerCantidad(valor.idBovedaContraparte)
        if (!contraparte) {
          ctx.addIssue({ code: 'custom', path: ['idBovedaContraparte'], message: 'Elige la bóveda que recibe el efectivo.' })
        } else if (contraparte === idBoveda) {
          ctx.addIssue({ code: 'custom', path: ['idBovedaContraparte'], message: 'Elige una bóveda distinta de esta.' })
        }
      }
      validarCantidades(valor.cantidades, ctx, 'Ingresa cuántas piezas de cada denominación se mueven.')
    })
    .transform(
      (valor): CrearSolicitudMovimiento => ({
        desglose: armarDesglose(valor.cantidades),
        tipoMovimiento: valor.tipoMovimiento as TipoMovimientoBoveda,
        ...(pideContraparte(valor.tipoMovimiento) ? { idBovedaContraparte: Number(valor.idBovedaContraparte) } : {}),
        ...(valor.observaciones ? { observaciones: valor.observaciones } : {}),
      }),
    )

/* ── BOV-05 · Registrar arqueo ───────────────────────────────────────── */

export interface ArqueoForm {
  tipoArqueo: (typeof TIPOS_ARQUEO)[number]
  idUsuarioTestigo: number | null
  observaciones: string
  cantidades: Cantidades
}

export const ARQUEO_VACIO: ArqueoForm = { tipoArqueo: 'Sorpresivo', idUsuarioTestigo: null, observaciones: '', cantidades: {} }

export const arqueoFormSchema = z
  .object({
    tipoArqueo: z.enum(TIPOS_ARQUEO),
    idUsuarioTestigo: z.number().nullable(),
    observaciones,
    cantidades: cantidadesSchema,
  })
  .superRefine((valor, ctx) => {
    if (valor.idUsuarioTestigo === null) {
      ctx.addIssue({ code: 'custom', path: ['idUsuarioTestigo'], message: 'Elige quién presencia el conteo.' })
    }
    validarCantidades(valor.cantidades, ctx, 'Registra las piezas que contaste de cada denominación.')
  })
  .transform(
    (valor): RegistrarArqueo => ({
      desglose: armarDesglose(valor.cantidades),
      tipoArqueo: valor.tipoArqueo,
      idUsuarioTestigo: valor.idUsuarioTestigo as number,
      ...(valor.observaciones ? { observaciones: valor.observaciones } : {}),
    }),
  )

export const DESCRIPCION_ARQUEO: Record<(typeof TIPOS_ARQUEO)[number], string> = {
  Sorpresivo: 'Sin aviso previo a quien custodia la bóveda.',
  Programado: 'Planificado con anticipación, como el de cierre de mes.',
}

/* ── Arqueo registrado ───────────────────────────────────────────────── */

const ESTADOS_ARQUEO: Record<string, string> = {
  REGISTRADO: 'Pendiente de aprobación',
  APROBADO: 'Aprobado',
  ANULADO: 'Anulado',
}

export const etiquetaEstadoArqueo = (estado: string) => ESTADOS_ARQUEO[estado.trim().toUpperCase()] ?? estado

export const arqueoPendiente = (arqueo: Pick<Arqueo, 'estado'>) => arqueo.estado.trim().toUpperCase() === 'REGISTRADO'

/** `sin-dato`: arqueos históricos que no guardaron saldos ni diferencia (llegan en null) */
export type ResultadoArqueo = 'cuadra' | 'faltante' | 'sobrante' | 'sin-dato'

export const resultadoArqueo = ({ diferencia }: Pick<Arqueo, 'diferencia'>): ResultadoArqueo =>
  diferencia == null ? 'sin-dato' : Math.abs(diferencia) < 0.005 ? 'cuadra' : diferencia < 0 ? 'faltante' : 'sobrante'

/** «Faltante de $10,00», «Sobrante de $0,25», «El conteo cuadra» o «Diferencia no registrada» */
export function textoDiferencia(arqueo: Pick<Arqueo, 'diferencia'>) {
  const resultado = resultadoArqueo(arqueo)
  if (resultado === 'sin-dato') return 'Diferencia no registrada'
  if (resultado === 'cuadra') return 'El conteo cuadra con el sistema'
  return `${resultado === 'faltante' ? 'Faltante' : 'Sobrante'} de ${formatearMonto(Math.abs(arqueo.diferencia ?? 0))}`
}

/** Monto o «—» cuando el arqueo no lo guardó */
export const montoArqueo = (valor: number | null | undefined) => (valor == null ? '—' : formatearMonto(valor))

/** «+3» o «−2» piezas */
export const piezasConSigno = (cantidad: number) => `${cantidad > 0 ? '+' : '−'}${Math.abs(cantidad)}`

/* ── Idempotencia de SMV-01 ──────────────────────────────────────────── */

/** UUID v4 (letras, números y guiones: cumple `^[A-Za-z0-9_-]{1,64}$`) */
export function nuevaClaveIdempotencia() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Misma clave para el mismo body (un reintento tras una respuesta perdida no duplica la solicitud) y
 * una nueva si cambió algo (es otra solicitud).
 */
export function claveParaEnvio(anterior: { firma: string; clave: string } | null, body: CrearSolicitudMovimiento) {
  const firma = JSON.stringify(body)
  return anterior && anterior.firma === firma ? anterior : { firma, clave: nuevaClaveIdempotencia() }
}
