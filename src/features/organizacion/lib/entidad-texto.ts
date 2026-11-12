import type { ApiError } from '@/shared/api'
import type { EstadoEntidad } from '@/features/organizacion/api/entidad.contract'

/* Cómo se muestran los datos de la entidad y sus errores (sin UI, para poder probarlo aparte) */

export const SIN_DATO = '—'

/** Los campos anulables que vienen en null (o vacíos) se muestran como «—» */
export const textoOpcional = (valor: string | number | null) =>
  valor === null || String(valor).trim() === '' ? SIN_DATO : String(valor)

const ETIQUETAS_ESTADO: Record<EstadoEntidad, string> = { A: 'Activa', I: 'Inactiva' }

export const etiquetaEstadoEntidad = (estado: EstadoEntidad) => ETIQUETAS_ESTADO[estado]

export const OPCIONES_ESTADO_ENTIDAD = (Object.keys(ETIQUETAS_ESTADO) as EstadoEntidad[]).map((value) => ({
  value,
  label: ETIQUETAS_ESTADO[value],
}))

/** Segmento SEPS: del 1 al 5 */
export const SEGMENTOS = [1, 2, 3, 4, 5] as const

const FECHA_LARGA = new Intl.DateTimeFormat('es-EC', { dateStyle: 'long', timeZone: 'UTC' })
const FECHA_HORA = new Intl.DateTimeFormat('es-EC', { dateStyle: 'long', timeStyle: 'short' })

/** `YYYY-MM-DD` es un día sin hora: «20 de mayo de 2010». Si no es una fecha, se muestra tal cual */
export function textoFechaConstitucion(fecha: string) {
  const dia = new Date(`${fecha}T00:00:00Z`)
  return Number.isNaN(dia.getTime()) ? fecha : FECHA_LARGA.format(dia)
}

/** Fecha y hora de registro; si no se puede leer, el texto original */
export function textoFechaRegistro(iso: string) {
  const fecha = new Date(iso)
  return Number.isNaN(fecha.getTime()) ? iso : FECHA_HORA.format(fecha)
}

/** Roles del endpoint (x-roles del OpenAPI): editar es solo de ADMIN */
const ROLES_EDITAR = ['ADMIN'] as const

/** Solo decide si se muestra el botón «Editar»: el backend valida el permiso de todos modos */
export function puedeEditarEntidad(roles: readonly string[]) {
  const propios = new Set(roles.map((rol) => rol.trim().toUpperCase()))
  return ROLES_EDITAR.some((rol) => propios.has(rol))
}

export type AccionEntidad = 'ver' | 'editar'

const SIN_PERMISO: Record<AccionEntidad, string> = {
  ver: 'No tienes permiso para ver los datos de la entidad.',
  editar: 'No tienes permiso para modificar los datos de la entidad.',
}

/** Errores del GET y el PATCH de la entidad por `code`; los demás muestran el mensaje del backend */
const MENSAJES: Record<string, string> = {
  ENTIDAD_NO_ENCONTRADA: 'La entidad todavía no está registrada en el sistema.',
  DATOS_INVALIDOS: 'Revisa los datos de la entidad: hay valores que no son válidos.',
}

export function mensajeErrorEntidad(error: ApiError, accion: AccionEntidad) {
  if (error.status === 403) return SIN_PERMISO[accion]
  return MENSAJES[error.code] ?? error.message
}

/** La entidad no existe aún (404): no es una falla, se muestra como estado vacío */
export const entidadNoRegistrada = (error: ApiError) => error.status === 404 || error.code === 'ENTIDAD_NO_ENCONTRADA'
