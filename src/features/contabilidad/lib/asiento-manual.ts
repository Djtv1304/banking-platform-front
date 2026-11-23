/**
 * E4-04 · Reglas del formulario de asiento manual y mensajes de error del backend (contrato propuesto).
 */
import {
  CONCEPTO_ASIENTO_MAXIMO,
  CONCEPTO_ASIENTO_MINIMO,
  type Asiento,
  type AsientoManual,
} from '@/features/contabilidad/api/asientos.contract'
import type { LineaAsientoPropuesta } from '@/features/contabilidad/lib/grilla-asiento'
import { esReverso } from '@/features/contabilidad/lib/asientos'
import { esNoDisponible } from '@/features/contabilidad/lib/mensajes'
import type { ApiError } from '@/shared/api'

export function errorConcepto(concepto: string): string | undefined {
  const largo = concepto.trim().length
  if (largo === 0) return 'Escribe el concepto del asiento.'
  if (largo < CONCEPTO_ASIENTO_MINIMO) return `El concepto debe tener al menos ${CONCEPTO_ASIENTO_MINIMO} caracteres.`
  if (largo > CONCEPTO_ASIENTO_MAXIMO) return `El concepto admite hasta ${CONCEPTO_ASIENTO_MAXIMO} caracteres.`
  return undefined
}

export const errorAgencia = (idAgencia: string) => (idAgencia ? undefined : 'Elige la agencia del asiento.')

export const cuerpoAsiento = (concepto: string, idAgencia: string, lineas: LineaAsientoPropuesta[]): AsientoManual => ({
  concepto: concepto.trim().replace(/\s+/g, ' '),
  idAgencia,
  lineas,
})

/** `/contabilidad/asientos/nuevo` o `/contabilidad/asientos/:idAsiento/editar`; `undefined` = id inválido */
export function idDeRuta(parametro: string | undefined): number | null | undefined {
  if (parametro === undefined) return null
  const id = Number(parametro)
  return Number.isInteger(id) && id > 0 ? id : undefined
}

/** Sólo un borrador se edita, se envía o se anula */
export const esBorrador = (estado: string) => estado.trim().toUpperCase() === 'BORRADOR'

const normalizar = (texto: string) => texto.trim().toUpperCase()

export const MENSAJE_ASIENTO_DE_OPERACION = 'Este asiento lo generó una operación: sólo se reversa desde la operación que lo originó.'

export interface AccionesAsiento {
  editar: boolean
  enviar: boolean
  anular: boolean
  reversar: boolean
}

/** Es un asiento contabilizado que no es manual (lo generó una operación): no se reversa desde aquí */
export const esAsientoDeOperacion = (asiento: Pick<Asiento, 'estado' | 'origen'>) =>
  normalizar(asiento.estado) === 'CONTABILIZADO' && normalizar(asiento.origen) !== 'MANUAL'

/** Qué acciones de E4-04 ofrece el detalle de un asiento según su estado, su origen y los permisos del usuario */
export function accionesDeAsiento(
  asiento: Pick<Asiento, 'estado' | 'origen' | 'idAsientoReversion'>,
  permisos: { puedeCrear: boolean; puedeReversar: boolean },
): AccionesAsiento {
  const borrador = esBorrador(asiento.estado) && permisos.puedeCrear
  return {
    editar: borrador,
    enviar: borrador,
    anular: borrador,
    reversar:
      permisos.puedeReversar &&
      normalizar(asiento.estado) === 'CONTABILIZADO' &&
      normalizar(asiento.origen) === 'MANUAL' &&
      !esReverso(asiento),
  }
}

export const MENSAJE_ASIENTO_MANUAL_NO_DISPONIBLE =
  'El registro de asientos manuales todavía no está disponible en el servidor. Tu borrador no se guardó.'

/** Por `code` (ProblemDetails, F-04); los de E4-04 vienen de los criterios de la historia */
const MENSAJES: Record<string, string> = {
  ASIENTO_NO_CUADRA: 'El servidor rechazó el asiento porque el debe y el haber no suman lo mismo.',
  CUENTA_SOLO_AUTOMATICA: 'Una de las cuentas sólo recibe asientos automáticos: cámbiala por otra.',
  CUENTA_CONTABLE_NO_HABILITADA: 'Una de las cuentas no está habilitada para movimientos: elige una cuenta auxiliar activa.',
  CUENTA_CONTABLE_NO_ENCONTRADA: 'Una de las cuentas ya no existe. Recarga la página y vuelve a elegirla.',
  ASIENTO_NO_EDITABLE: 'Este asiento ya no es un borrador: no se puede cambiar.',
  ASIENTO_NO_ENCONTRADO: 'El asiento ya no existe.',
  ASIENTO_DE_OPERACION: MENSAJE_ASIENTO_DE_OPERACION,
  ASIENTO_YA_REVERSADO: 'Este asiento ya tiene un reverso.',
  FECHA_CONTABLE_CERRADA: 'La fecha contable está cerrada: no se pueden registrar asientos hoy.',
  AUTOAPROBACION_NO_PERMITIDA: 'No puedes aprobar un asiento que registraste tú: debe aprobarlo otra persona.',
}

export function mensajeErrorAsientoManual(error: ApiError, accion: 'guardar' | 'enviar' | 'anular' | 'reversar' = 'guardar') {
  if (esNoDisponible(error)) return MENSAJE_ASIENTO_MANUAL_NO_DISPONIBLE
  if (MENSAJES[error.code]) return MENSAJES[error.code]
  if (error.status === 403) {
    return accion === 'reversar'
      ? 'Tu rol no puede solicitar reversos de asientos.'
      : 'Tu rol no puede registrar asientos manuales.'
  }
  return error.message
}

/** «lineas[2].monto» → «Línea 3: …»; el resto de campos tal cual. Vacío si no hay errores de campo. */
export function detalleErroresAsiento(error: ApiError): string[] {
  return error.fields.map(({ field, message }) => {
    const linea = /^lineas\[(\d+)\]/.exec(field)
    if (linea) return `Línea ${Number(linea[1]) + 1}: ${message}`
    if (field === 'concepto') return `Concepto: ${message}`
    return message
  })
}
