import { formatRol } from '@/features/auth'
import type { Agencia } from '@/features/catalogos'
import { ESTADOS_USUARIO, ROLES_USUARIO } from '@/features/usuarios/api/usuarios.contract'

/* Cómo se muestran los datos de un usuario (sin UI, para poder probarlo aparte) */

export const OPCIONES_ROL = ROLES_USUARIO.map((rol) => ({ value: rol, label: formatRol(rol) }))

export const OPCIONES_ESTADO = ESTADOS_USUARIO.map((estado) => ({ value: estado, label: estado }))

/*
 * `vinculado` en la UI es el «primer ingreso»: el usuario aceptó la invitación, entró por primera vez
 * y su cuenta de acceso quedó asociada. Se evita hablar de IDs o de vínculos técnicos.
 */
export const OPCIONES_VINCULADO = [
  { value: 'true', label: 'Ya ingresaron' },
  { value: 'false', label: 'Aún no ingresan' },
] as const

export type TonoEstado = 'activo' | 'inactivo' | 'bloqueado' | 'otro'

/** El backend envía «Activo», «Inactivo»…; se compara sin mayúsculas por si cambia el formato */
export function tonoEstado(estado: string): TonoEstado {
  const valor = estado.trim().toLowerCase()
  if (valor.startsWith('activ')) return 'activo'
  if (valor.startsWith('inactiv')) return 'inactivo'
  if (valor.startsWith('bloque')) return 'bloqueado'
  return 'otro'
}

const FECHA = new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
const FECHA_HORA = new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' })

/**
 * Las fechas llegan sin zona y con microsegundos (`2026-11-09T04:26:40.093000`) y están en UTC
 * (un último acceso de la tarde en Ecuador llega con hora de la noche). Se completan con `Z` y se
 * recortan a milisegundos para leerlas igual en todos los navegadores.
 * TODO(API): confirmar con el backend que las fechas sin zona son UTC (o que envíe la zona).
 */
export function leerFecha(valor: string) {
  const iso = valor.trim().replace(/(\.\d{3})\d+/, '$1')
  const conZona = /(Z|[+-]\d{2}:?\d{2})$/i.test(iso) || !iso.includes('T') ? iso : `${iso}Z`
  const fecha = new Date(conZona)
  return Number.isNaN(fecha.getTime()) ? null : fecha
}

/** «09 nov 2026»; si no es una fecha válida se muestra tal cual */
export function formatearFecha(valor: string) {
  const fecha = leerFecha(valor)
  return fecha ? FECHA.format(fecha) : valor
}

/** «12 nov 2026, 18:34» en la hora local del navegador */
export function formatearFechaHora(valor: string) {
  const fecha = leerFecha(valor)
  return fecha ? FECHA_HORA.format(fecha) : valor
}

/** «hace 3 días», «hace 2 h»… para el último ingreso; null si la fecha no es válida */
export function haceCuanto(valor: string, ahora = new Date()) {
  const fecha = leerFecha(valor)
  if (!fecha) return null
  const minutos = Math.round((ahora.getTime() - fecha.getTime()) / 60_000)
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
  if (Math.abs(minutos) < 60) return rtf.format(-minutos, 'minute')
  const horas = Math.round(minutos / 60)
  if (Math.abs(horas) < 24) return rtf.format(-horas, 'hour')
  const dias = Math.round(horas / 24)
  if (Math.abs(dias) < 30) return rtf.format(-dias, 'day')
  const meses = Math.round(dias / 30)
  return Math.abs(meses) < 12 ? rtf.format(-meses, 'month') : rtf.format(-Math.round(meses / 12), 'year')
}

/** Estados de la invitación de WorkOS, en palabras para quien administra */
const INVITACION: Record<string, string> = {
  pending: 'Enviada, aún sin aceptar',
  accepted: 'Aceptada',
  expired: 'Vencida',
  revoked: 'Anulada',
}

export const etiquetaInvitacion = (estado: string) => INVITACION[estado.trim().toLowerCase()] ?? estado

/** La invitación ya no sirve para ingresar (hay que reenviarla desde WorkOS) */
export const invitacionCaducada = (estado: string | null | undefined) =>
  !!estado && ['expired', 'revoked'].includes(estado.trim().toLowerCase())

/** «Kevin Alejandro Tapia Guerrero» */
export const nombreCompleto = ({ nombres, apellidos }: { nombres: string; apellidos: string }) =>
  `${nombres} ${apellidos}`.trim()

/** Iniciales para el avatar: «KT» */
export function iniciales({ nombres, apellidos }: { nombres: string; apellidos: string }) {
  return `${nombres.trim().charAt(0)}${apellidos.trim().charAt(0)}`.toUpperCase() || '?'
}

/** «001 · MATRIZ» (solo el id si el catálogo usa el código como nombre) */
export const etiquetaAgencia = ({ idAgencia, nombre }: Pick<Agencia, 'idAgencia' | 'nombre'>) =>
  nombre && nombre !== idAgencia ? `${idAgencia} · ${nombre}` : idAgencia

/** El backend puede devolver el campo como `username` o `body.username`: se usa el último tramo */
export const nombreCampo = (field: string) => field.split('.').pop() ?? field

const ROLES_MULTIAGENCIA = new Set(['ADMIN', 'SUPERVISOR', 'CONTADOR', 'AUDITOR', 'APROBADOR_CREDITO'])

export function admiteVariasAgencias(roles: readonly string[]): boolean {
  return !roles.includes('CAJERO') && !roles.includes('ASESOR') && roles.some((rol) => ROLES_MULTIAGENCIA.has(rol))
}
