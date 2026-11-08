import type { ApiError } from '@/shared/api'
import type { CupoEfectivo } from '@/features/cuenta/api/cupos.contract'

/* Reglas de pantalla de los cupos por canal (A-06), sin UI para poder probarlas aparte */

const aCentavos = (monto: number) => Math.round(monto * 100)

/** Lo que aún se puede mover: cupo − consumido, en centavos exactos y nunca negativo */
export const disponible = (cupo: number, consumido: number) =>
  Math.max(0, aCentavos(cupo) - aCentavos(consumido)) / 100

/** CTA-07 no trae el disponible: se calcula con lo consumido hoy y en el mes */
export const disponibleCupo = (cupo: Pick<CupoEfectivo, 'cupoDiario' | 'cupoMensual' | 'consumidoHoy' | 'consumidoMes'>) => ({
  diario: disponible(cupo.cupoDiario, cupo.consumidoHoy),
  mensual: disponible(cupo.cupoMensual, cupo.consumidoMes),
})

/** Roles de cada endpoint (x-roles del OpenAPI): CTA-07, CTA-08 y CTA-09 */
const ROLES_CUPOS = {
  ver: ['ASESOR', 'SUPERVISOR', 'ADMIN'],
  editar: ['SUPERVISOR', 'ADMIN'],
  historial: ['SUPERVISOR', 'AUDITOR', 'ADMIN'],
} as const

export type AccionCupos = keyof typeof ROLES_CUPOS

/**
 * Qué acciones se muestran según los roles de /auth/me (llegan en mayúsculas). Solo decide qué se
 * ve: cada endpoint valida sus propios permisos.
 */
export function permisosCupos(roles: readonly string[]): Record<AccionCupos, boolean> {
  const propios = new Set(roles.map((rol) => rol.trim().toUpperCase()))
  const alguno = (permitidos: readonly string[]) => permitidos.some((rol) => propios.has(rol))
  return { ver: alguno(ROLES_CUPOS.ver), editar: alguno(ROLES_CUPOS.editar), historial: alguno(ROLES_CUPOS.historial) }
}

const FECHA_VIGENCIA = new Intl.DateTimeFormat('es-EC', { dateStyle: 'long', timeZone: 'UTC' })

/** «Hasta el 31 de diciembre de 2026» (inclusive) o «Sin caducidad». `YYYY-MM-DD` es un día, sin hora */
export function textoVigencia(fecha: string | null) {
  if (!fecha) return 'Sin caducidad'
  const dia = new Date(`${fecha}T00:00:00Z`)
  return Number.isNaN(dia.getTime()) ? fecha : `Hasta el ${FECHA_VIGENCIA.format(dia)}`
}

const SIN_PERMISO: Record<AccionCupos, string> = {
  ver: 'No tienes permiso para ver los cupos de esta cuenta.',
  editar: 'No tienes permiso para modificar los cupos de esta cuenta.',
  historial: 'No tienes permiso para ver el historial de cupos.',
}

/** Errores de CTA-07/08/09 por `code`; los demás muestran el mensaje del backend */
const MENSAJES: Record<string, string> = {
  CUENTA_NO_ENCONTRADA: 'No existe una cuenta con ese ID.',
  CANAL_NO_ENCONTRADO: 'El canal ya no existe.',
  CUPO_PRODUCTO_NO_CONFIGURADO: 'El producto de la cuenta no tiene cupo en este canal: no se puede personalizar.',
  CUPO_SUPERA_MAXIMO_PRODUCTO: 'Un monto o el máximo de transacciones supera el cupo del producto en este canal.',
  CUPOS_INCONSISTENTES: 'El máximo por transacción debe ser menor o igual al cupo diario, y este al mensual.',
  DATOS_INVALIDOS: 'Revisa los datos del cupo: hay valores que no son válidos.',
}

export function mensajeErrorCupos(error: ApiError, accion: AccionCupos) {
  if (error.status === 403) return SIN_PERMISO[accion]
  return MENSAJES[error.code] ?? error.message
}
