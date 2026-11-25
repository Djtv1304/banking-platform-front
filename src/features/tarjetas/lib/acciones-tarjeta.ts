import { z } from 'zod'

import type { ApiError } from '@/shared/api'
import { hasPermission, PERMISOS } from '@/shared/lib'
import {
  ESTADOS_TERMINALES,
  type EstadoTarjeta,
  type Tarjeta,
} from '@/features/tarjetas/api/tarjetas.contract'
import { TARJETA_INEXISTENTE } from '@/features/tarjetas/lib/formato-consulta'

/* Reglas de pantalla del cambio de estado y del PIN (A-05), sin UI para poder probarlas aparte */

export interface AccionEstado {
  destino: EstadoTarjeta
  etiqueta: string
}

/**
 * Tarjeta.TransicionEstado del backend. Generada → Activa no se ofrece nunca: es automática
 * (primer cambio de PIN en débito, 3 días laborables en crédito) y el backend responde 409.
 */
const TRANSICIONES: Record<string, readonly AccionEstado[]> = {
  Solicitada: [
    { destino: 'Aprobada', etiqueta: 'Aprobar' },
    { destino: 'Anulada', etiqueta: 'Anular solicitud' },
  ],
  Aprobada: [
    { destino: 'Generada', etiqueta: 'Registrar emisión' },
    { destino: 'Anulada', etiqueta: 'Anular' },
  ],
  Generada: [{ destino: 'Anulada', etiqueta: 'Anular' }],
  Activa: [
    { destino: 'Bloqueada', etiqueta: 'Bloquear' },
    { destino: 'Inactiva', etiqueta: 'Inactivar' },
    { destino: 'Cancelada', etiqueta: 'Cancelar tarjeta' },
    { destino: 'Vencida', etiqueta: 'Marcar como vencida' },
    { destino: 'Cerrada', etiqueta: 'Cerrar' },
  ],
  Bloqueada: [
    { destino: 'Activa', etiqueta: 'Desbloquear' },
    { destino: 'Cancelada', etiqueta: 'Cancelar tarjeta' },
  ],
  Inactiva: [
    { destino: 'Activa', etiqueta: 'Reactivar' },
    { destino: 'Cancelada', etiqueta: 'Cancelar tarjeta' },
    { destino: 'Cerrada', etiqueta: 'Cerrar' },
  ],
  Vencida: [{ destino: 'Cerrada', etiqueta: 'Cerrar' }],
}

/** Cambios que se ofrecen desde el estado actual; uno desconocido o terminal no ofrece ninguno */
export const accionesEstado = (estadoActual: string): readonly AccionEstado[] => TRANSICIONES[estadoActual] ?? []

/** Estados de los que la tarjeta ya no vuelve */
export const esIrreversible = (destino: EstadoTarjeta) => ['Anulada', 'Cancelada', 'Cerrada'].includes(destino)

const esTerminal = (estado: string) => (ESTADOS_TERMINALES as readonly string[]).includes(estado)

/** TAR-05 · Solo una tarjeta con PIN y que todavía se puede usar */
export const admiteRegenerarPin = (tarjeta: Pick<Tarjeta, 'pinAsignado' | 'estadoActual'>) =>
  tarjeta.pinAsignado && !esTerminal(tarjeta.estadoActual)

/**
 * TAR-07 · El sobre de PIN solo existe para débito, y no se entrega si la tarjeta ya no se puede
 * usar (el backend no lo revisa: entregar el PIN de una tarjeta cancelada no tiene sentido)
 */
export const admiteSobrePin = (tarjeta: Pick<Tarjeta, 'pinAsignado' | 'tipoTarjeta' | 'estadoActual'>) =>
  tarjeta.tipoTarjeta === 'Debito' && tarjeta.pinAsignado && !esTerminal(tarjeta.estadoActual)

/** Roles de TAR-06 y TAR-07; TAR-04 y TAR-05 dependen de permisos de WorkOS */
const ROLES_TARJETA = {
  sobrePin: ['ASESOR', 'SUPERVISOR', 'ADMIN'],
  historial: ['SUPERVISOR', 'AUDITOR', 'ADMIN'],
} as const

export type AccionTarjeta = 'estado' | 'pin' | 'sobrePin' | 'historial'

/**
 * Qué se muestra según los roles (en mayúsculas) y permisos de /auth/me. Solo decide qué se ve:
 * cada endpoint valida sus propios permisos.
 */
export function permisosTarjeta(roles: readonly string[], permisos: readonly string[]): Record<AccionTarjeta, boolean> {
  const propios = new Set(roles.map((rol) => rol.trim().toUpperCase()))
  const alguno = (permitidos: readonly string[]) => permitidos.some((rol) => propios.has(rol))
  return {
    estado: hasPermission(permisos, PERMISOS.tarjetasEstado),
    pin: hasPermission(permisos, PERMISOS.tarjetasEmitir),
    sobrePin: alguno(ROLES_TARJETA.sobrePin),
    historial: alguno(ROLES_TARJETA.historial),
  }
}

/*
 * Motivo del cambio (TarjetaEstadoUpdate): 1–500 caracteres sin caracteres de control. Los saltos
 * de línea y espacios repetidos del textarea se convierten en un espacio antes de validar.
 */
export const MAX_MOTIVO = 500

const normalizar = (texto: string) => texto.replace(/\s+/g, ' ').trim()
const sinControl = (texto: string) => !/\p{Cc}/u.test(texto)
const CONTROL = 'Quita los caracteres especiales del texto.'

export const motivoFormSchema = z.object({
  motivo: z
    .string()
    .transform(normalizar)
    .pipe(
      z
        .string()
        .min(1, 'Escribe el motivo del cambio.')
        .max(MAX_MOTIVO, `El motivo admite hasta ${MAX_MOTIVO} caracteres.`)
        .refine(sinControl, CONTROL),
    ),
})

/** Causas de bloqueo (JPRFM-2026-048-T: bloqueo inmediato con motivo y trazabilidad) */
export const CAUSAS_BLOQUEO = ['Pérdida', 'Robo', 'Sospecha de fraude', 'Pedido del cliente', 'Otra'] as const
export type CausaBloqueo = (typeof CAUSAS_BLOQUEO)[number]

/** Lo que cabe tras la causa más larga y «: » sin pasar de 500 */
export const MAX_DETALLE_BLOQUEO = MAX_MOTIVO - Math.max(...CAUSAS_BLOQUEO.map((causa) => causa.length)) - 2

/** «Robo: reportado en agencia» o solo «Robo» si no hay detalle */
export const armarMotivoBloqueo = (causa: CausaBloqueo, detalle: string) => {
  const limpio = normalizar(detalle)
  return limpio ? `${causa}: ${limpio}` : causa
}

export const bloqueoFormSchema = z
  .object({
    causa: z
      .union([z.literal(''), z.enum(CAUSAS_BLOQUEO)])
      .refine((causa) => causa !== '', 'Elige la causa del bloqueo.'),
    detalle: z
      .string()
      .transform(normalizar)
      .pipe(
        z
          .string()
          .max(MAX_DETALLE_BLOQUEO, `El detalle admite hasta ${MAX_DETALLE_BLOQUEO} caracteres.`)
          .refine(sinControl, CONTROL),
      ),
  })
  .refine(({ causa, detalle }) => causa !== 'Otra' || detalle !== '', {
    path: ['detalle'],
    message: 'Con la causa «Otra», describe el motivo del bloqueo.',
  })
  .transform(({ causa, detalle }) => ({ motivo: armarMotivoBloqueo(causa as CausaBloqueo, detalle) }))

export type MotivoFormInput = z.input<typeof motivoFormSchema>
export type BloqueoFormInput = z.input<typeof bloqueoFormSchema>
/** Ambos formularios terminan en el mismo `motivo` del body de TAR-04 */
export type MotivoFormData = z.output<typeof motivoFormSchema>

const FECHA_HORA = new Intl.DateTimeFormat('es-EC', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'America/Guayaquil',
})

/** «17 de noviembre de 2026, 10:15» en hora de Ecuador; un texto que no es fecha se muestra tal cual */
export function formatearFechaHora(valor: Date | string) {
  const fecha = typeof valor === 'string' ? new Date(valor) : valor
  return Number.isNaN(fecha.getTime()) ? String(valor) : FECHA_HORA.format(fecha)
}

/**
 * Aviso tras generar un PIN de débito. El back sólo arma el sobre si tiene almacén configurado
 * (si no, aprueba igual y no hay sobre), y la respuesta no dice cuál de los dos pasó: no se
 * promete el sobre; si no existe, la descarga responde SOBRE_PIN_NO_DISPONIBLE.
 */
export const AVISO_SOBRE_PIN =
  'Descarga el sobre de PIN para entregárselo al cliente; si el servidor no lo generó, te lo indicará.'

/** Confirmación tras TAR-04; al aprobar una de débito se intenta generar su sobre de PIN */
export function mensajeCambioEstado(destino: EstadoTarjeta, tarjeta: Pick<Tarjeta, 'tipoTarjeta'>, fecha: Date) {
  const base = `La tarjeta pasó a ${destino} el ${formatearFechaHora(fecha)}.`
  return destino === 'Aprobada' && tarjeta.tipoTarjeta === 'Debito' ? `${base} ${AVISO_SOBRE_PIN}` : base
}

export const SOBRE_YA_DESCARGADO = 'Este sobre ya se descargó. Si el cliente no lo recibió, regenera el PIN.'

const SIN_PERMISO: Record<AccionTarjeta, string> = {
  estado: 'No tienes permiso para cambiar el estado de esta tarjeta.',
  pin: 'No tienes permiso para regenerar el PIN de esta tarjeta.',
  sobrePin: 'No tienes permiso para descargar el sobre de PIN.',
  historial: 'No tienes permiso para ver el historial de esta tarjeta.',
}

const SERVICIO_PIN_NO_DISPONIBLE = 'El servicio de PIN no está disponible en este momento. Inténtalo más tarde.'

const MENSAJES: Record<string, string> = {
  TARJETA_NO_ENCONTRADA: TARJETA_INEXISTENTE,
  TRANSICION_INVALIDA: 'La tarjeta ya no admite ese cambio de estado. Revisa su estado actual.',
  ACTIVACION_AUTOMATICA:
    'Esta tarjeta se activa sola: con el primer cambio de PIN (débito) o a los 3 días laborables de su emisión (crédito).',
  PIN_NO_ASIGNADO: 'La tarjeta no tiene un PIN asignado y no se puede activar.',
  PIN_NO_PERMITIDO: 'La tarjeta no admite un PIN nuevo en su estado actual.',
  // El PIN quedó en el HSM pero no su registro: reintentar generaría otro sin resolver el primero
  PIN_ASIGNACION_NO_CONFIRMADA:
    'El PIN se generó, pero no pudimos confirmar su registro. No lo intentes de nuevo: avisa a soporte para conciliarlo.',
  SOBRE_PIN_ENTREGADO: SOBRE_YA_DESCARGADO,
  SOBRE_PIN_NO_DISPONIBLE: 'Esta tarjeta no tiene un sobre de PIN pendiente de entrega.',
  RANGO_FECHAS_INVALIDO: 'La fecha «Desde» no puede ser posterior a la fecha «Hasta».',
}

const DATOS_INVALIDOS: Record<AccionTarjeta, string> = {
  estado: 'Revisa el motivo: tiene caracteres que no son válidos.',
  pin: 'No pudimos procesar la solicitud. Inténtalo nuevamente.',
  sobrePin: 'No pudimos procesar la solicitud. Inténtalo nuevamente.',
  historial: 'Revisa las fechas del filtro: hay valores que no son válidos.',
}

/** Errores de TAR-04 a TAR-07 por `code`; los demás muestran el mensaje del backend */
export function mensajeErrorAccionTarjeta(error: ApiError, accion: AccionTarjeta) {
  if (error.status === 403) return SIN_PERMISO[accion]
  if (error.code === 'DATOS_INVALIDOS') return DATOS_INVALIDOS[accion]
  if (MENSAJES[error.code]) return MENSAJES[error.code]
  if (error.status === 503 && accion !== 'historial') return SERVICIO_PIN_NO_DISPONIBLE
  return error.message
}
