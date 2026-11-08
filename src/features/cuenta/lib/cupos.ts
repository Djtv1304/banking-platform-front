import { z } from 'zod'

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

/*
 * Formulario del cupo personalizado (CTA-08). Los campos son texto y el esquema arma el body
 * numérico. Mismas reglas que `CupoUpdate` del backend: importes > 0 con 2 decimales como máximo
 * (decimal(18,2)), frecuencia entera de 1 a 32 767 (smallint) y vigencia opcional.
 */

/** Hasta 16 enteros y 2 decimales; se acepta punto o coma decimal, sin separador de miles */
const MONTO_REGEX = /^\d{1,16}([.,]\d{1,2})?$/
const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/
export const MAX_TRANSACCIONES_DIA = 32_767

/**
 * `abort`: el primer error del campo detiene sus demás reglas y también la coherencia entre
 * montos, que solo se revisa con los tres montos válidos.
 */
const corta = (error: string) => ({ error, abort: true })

const monto = z
  .string()
  .trim()
  .min(1, corta('Ingresa un monto.'))
  .regex(MONTO_REGEX, corta('Ingresa un monto válido, con 2 decimales como máximo.'))
  .transform((valor) => Number(valor.replace(',', '.')))
  .refine((valor) => valor > 0, corta('El monto debe ser mayor que 0.'))

export const cupoFormSchema = z
  .object({
    cupoDiario: monto,
    cupoMensual: monto,
    montoMaxTransaccion: monto,
    maxTransaccionesDia: z
      .string()
      .trim()
      .regex(/^\d+$/, corta('Ingresa un número entero.'))
      .transform(Number)
      .refine(
        (valor) => valor >= 1 && valor <= MAX_TRANSACCIONES_DIA,
        corta(`Ingresa un número entre 1 y ${MAX_TRANSACCIONES_DIA.toLocaleString('es-EC')}.`),
      ),
    /** '' = sin caducidad (null en el body) */
    fechaVigencia: z
      .string()
      .refine((valor) => valor === '' || FECHA_REGEX.test(valor), corta('Ingresa una fecha válida.'))
      .transform((valor) => valor || null),
  })
  // Misma coherencia que exige el backend (422 CUPOS_INCONSISTENTES): máx. por transacción ≤ diario ≤ mensual
  .superRefine((valor, ctx) => {
    if (valor.montoMaxTransaccion > valor.cupoDiario) {
      ctx.addIssue({ code: 'custom', path: ['montoMaxTransaccion'], message: 'No puede superar el cupo diario.' })
    }
    if (valor.cupoDiario > valor.cupoMensual) {
      ctx.addIssue({ code: 'custom', path: ['cupoMensual'], message: 'Debe ser mayor o igual al cupo diario.' })
    }
  })

export type CupoFormInput = z.input<typeof cupoFormSchema>
/** Exactamente el body de CTA-08 (`CupoUpdate`): ni un campo más */
export type CupoFormData = z.output<typeof cupoFormSchema>

/** El formulario arranca con el cupo que rige hoy en el canal */
export const valoresCupo = (cupo: CupoEfectivo): CupoFormInput => ({
  cupoDiario: String(cupo.cupoDiario),
  cupoMensual: String(cupo.cupoMensual),
  montoMaxTransaccion: String(cupo.montoMaxTransaccion),
  maxTransaccionesDia: String(cupo.maxTransaccionesDia),
  fechaVigencia: cupo.fechaVigencia ?? '',
})
