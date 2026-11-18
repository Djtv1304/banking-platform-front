import type { z } from 'zod'

import { ApiError, apiClient, toApiError } from '@/shared/api'
import {
  arqueoSchema,
  BOVEDAS_ENDPOINTS,
  bovedaSchema,
  IDEMPOTENCY_KEY_REGEX,
  movimientosRegistradosSchema,
  paginaMovimientosBovedaSchema,
  registrarArqueoSchema,
  registrarMovimientoSchema,
  type RegistrarArqueo,
  type RegistrarMovimiento,
} from '@/features/boveda/api/bovedas.contract'

const RESPUESTA_INVALIDA = 'No pudimos leer la respuesta del servidor. Inténtalo más tarde.'

function validar<T extends z.ZodType>(schema: T, data: unknown, status: number): z.infer<T> {
  const result = schema.safeParse(data)
  if (!result.success) throw new ApiError(RESPUESTA_INVALIDA, status, 'respuesta_invalida')
  return result.data
}

/** BOV-01 · `params` trae solo los filtros con valor (`idAgencia`, `tipo`) */
export async function listarBovedas(params: Record<string, string>, signal?: AbortSignal) {
  const { data, status } = await apiClient.get<unknown>(BOVEDAS_ENDPOINTS.listar, { params, signal })
  return validar(bovedaSchema.array(), data, status)
}

/** BOV-02 · Saldo y denominaciones. Bóveda inexistente → 404 */
export async function obtenerBoveda(idBoveda: number, signal?: AbortSignal) {
  const { data, status } = await apiClient.get<unknown>(BOVEDAS_ENDPOINTS.detalle(idBoveda), { signal })
  const boveda = validar(bovedaSchema, data, status)
  if (boveda.idBoveda !== idBoveda) throw new ApiError(RESPUESTA_INVALIDA, status, 'respuesta_invalida')
  return boveda
}

/** BOV-03 · Movimientos paginados, más recientes primero si no se envía `sort` */
export async function listarMovimientosBoveda(idBoveda: number, params: Record<string, string>, signal?: AbortSignal) {
  const { data, status } = await apiClient.get<unknown>(BOVEDAS_ENDPOINTS.movimientos(idBoveda), { params, signal })
  return validar(paginaMovimientosBovedaSchema, data, status)
}

export const esBovedaInexistente = (error: unknown) => toApiError(error).status === 404

/** Mensaje de un error de BOV-01, BOV-02 o BOV-03. `que` completa «No tienes permiso para …» */
export function mensajeErrorBoveda(error: unknown, que: string) {
  const e = toApiError(error)
  if (e.status === 403) return `Tu rol no tiene permiso para ${que}.`
  if (e.status === 404) return 'No existe una bóveda con ese ID.'
  if (e.status === 429) return 'Hiciste demasiadas consultas seguidas. Espera un momento y vuelve a intentarlo.'
  return e.message
}

const SIN_CONFIRMAR = 'sin_confirmar'

/** 200 o 201 con la forma esperada; cualquier otra cosa no confirma que la operación se haya hecho */
function confirmar<T extends z.ZodType>(schema: T, data: unknown, status: number, mensaje: string): z.infer<T> {
  const result = schema.safeParse(data)
  if ((status !== 200 && status !== 201) || !result.success) throw new ApiError(mensaje, status, SIN_CONFIRMAR)
  return result.data
}

/**
 * BOV-04 · La clave de idempotencia viaja siempre: si la respuesta se pierde, reintentar con la misma
 * clave y el mismo body no registra el movimiento dos veces.
 */
export async function registrarMovimiento(idBoveda: number, movimiento: RegistrarMovimiento, idempotencyKey: string) {
  if (!IDEMPOTENCY_KEY_REGEX.test(idempotencyKey)) throw new Error('Idempotency-Key inválida')
  const body = registrarMovimientoSchema.parse(movimiento)
  const { data, status } = await apiClient.post<unknown>(BOVEDAS_ENDPOINTS.movimientos(idBoveda), body, {
    headers: { 'Idempotency-Key': idempotencyKey },
  })
  return confirmar(movimientosRegistradosSchema, data, status, 'No pudimos confirmar el registro del movimiento.')
}

/** BOV-05 · Nunca se reintenta solo: una respuesta perdida no prueba que el arqueo no se haya registrado */
export async function registrarArqueo(idBoveda: number, arqueo: RegistrarArqueo) {
  const body = registrarArqueoSchema.parse(arqueo)
  const { data, status } = await apiClient.post<unknown>(BOVEDAS_ENDPOINTS.arqueos(idBoveda), body)
  const registrado = confirmar(arqueoSchema, data, status, 'No pudimos confirmar el registro del arqueo.')
  if (registrado.idBoveda !== idBoveda) throw new ApiError('No pudimos confirmar el registro del arqueo.', status, SIN_CONFIRMAR)
  return registrado
}

/** BOV-06 · Sin body. Aprobar genera los movimientos de ajuste de la diferencia */
export async function aprobarArqueo(idArqueoBoveda: number) {
  const { data, status } = await apiClient.post<unknown>(BOVEDAS_ENDPOINTS.aprobacion(idArqueoBoveda))
  const arqueo = confirmar(arqueoSchema, data, status, 'No pudimos confirmar la aprobación del arqueo.')
  if (arqueo.idArqueoBoveda !== idArqueoBoveda) {
    throw new ApiError('No pudimos confirmar la aprobación del arqueo.', status, SIN_CONFIRMAR)
  }
  return arqueo
}

/** Sin respuesta clara (red, 5xx o una respuesta que no se pudo leer): no se sabe si la operación quedó hecha */
export function operacionSinConfirmar(error: unknown) {
  const e = toApiError(error)
  return e.status === null || e.status >= 500 || e.code === SIN_CONFIRMAR
}

/**
 * Mensaje general de un error de BOV-04, BOV-05 o BOV-06; los errores por campo se muestran junto
 * a cada campo. `seguroReintentar`: el reintento no duplica la operación (BOV-04 con la misma clave).
 */
export function mensajeErrorOperacion(error: unknown, que: string, seguroReintentar = false) {
  const e = toApiError(error)
  if (e.status === 403) return `Tu rol no tiene permiso para ${que}.`
  if (e.status === 404) return e.message || 'No encontramos la bóveda o el arqueo. Puede que ya no exista.'
  if (e.status === 429) return 'Hiciste demasiados intentos seguidos. Espera un momento y vuelve a intentarlo.'
  if (operacionSinConfirmar(error)) {
    return seguroReintentar
      ? 'No pudimos confirmar si quedó registrado. Puedes reintentar sin cambiar nada: no se registrará dos veces.'
      : 'No pudimos confirmar si quedó registrado. Revisa los movimientos de la bóveda antes de volver a intentarlo.'
  }
  if ((e.status === 400 || e.status === 422) && e.fields.length > 0) return 'Revisa los campos marcados.'
  // 409 (p. ej. piezas insuficientes, arqueo ya aprobado o anulado) trae un detalle legible del backend
  return e.message
}
