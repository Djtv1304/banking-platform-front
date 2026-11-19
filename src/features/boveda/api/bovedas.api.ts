import type { z } from 'zod'

import { ApiError, apiClient, toApiError } from '@/shared/api'
import {
  arqueoSchema,
  BOVEDAS_ENDPOINTS,
  bovedaSchema,
  crearSolicitudMovimientoSchema,
  IDEMPOTENCY_KEY_REGEX,
  motivoResolucionSchema,
  movimientosEjecutadosSchema,
  paginaArqueosSchema,
  paginaMovimientosBovedaSchema,
  paginaSolicitudesMovimientoSchema,
  registrarArqueoSchema,
  solicitudMovimientoSchema,
  type CrearSolicitudMovimiento,
  type RegistrarArqueo,
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

/** BOV-07 · Arqueos paginados de una bóveda */
export async function listarArqueosBoveda(idBoveda: number, params: Record<string, string>, signal?: AbortSignal) {
  const { data, status } = await apiClient.get<unknown>(BOVEDAS_ENDPOINTS.arqueos(idBoveda), { params, signal })
  return validar(paginaArqueosSchema, data, status)
}

/** SMV-02 · `params` trae solo los filtros con valor (`idAgencia`, `estado`) más la página */
export async function listarSolicitudesMovimiento(params: Record<string, string>, signal?: AbortSignal) {
  const { data, status } = await apiClient.get<unknown>(BOVEDAS_ENDPOINTS.solicitudes, { params, signal })
  return validar(paginaSolicitudesMovimientoSchema, data, status)
}

/** SMV-03 · Solicitud inexistente → 404 */
export async function obtenerSolicitudMovimiento(idSolicitud: number, signal?: AbortSignal) {
  const { data, status } = await apiClient.get<unknown>(BOVEDAS_ENDPOINTS.solicitud(idSolicitud), { signal })
  const solicitud = validar(solicitudMovimientoSchema, data, status)
  if (solicitud.idSolicitudMovimiento !== idSolicitud) throw new ApiError(RESPUESTA_INVALIDA, status, 'respuesta_invalida')
  return solicitud
}

export const esBovedaInexistente = (error: unknown) => toApiError(error).status === 404

/** Mensaje de un error de consulta (BOV-01 a BOV-03, BOV-07, SMV-02 y SMV-03). `que` completa «No tienes permiso para …» */
export function mensajeErrorBoveda(error: unknown, que: string, inexistente = 'No existe una bóveda con ese ID.') {
  const e = toApiError(error)
  if (e.status === 403) return `Tu rol no tiene permiso para ${que}.`
  if (e.status === 404) return inexistente
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
 * SMV-01 · La clave de idempotencia viaja siempre: si la respuesta se pierde, reintentar con la misma
 * clave y el mismo body no crea la solicitud dos veces. No mueve efectivo: queda PENDIENTE.
 */
export async function crearSolicitudMovimiento(idBoveda: number, solicitud: CrearSolicitudMovimiento, idempotencyKey: string) {
  if (!IDEMPOTENCY_KEY_REGEX.test(idempotencyKey)) throw new Error('Idempotency-Key inválida')
  const body = crearSolicitudMovimientoSchema.parse(solicitud)
  const { data, status } = await apiClient.post<unknown>(BOVEDAS_ENDPOINTS.crearSolicitud(idBoveda), body, {
    headers: { 'Idempotency-Key': idempotencyKey },
  })
  const creada = confirmar(solicitudMovimientoSchema, data, status, 'No pudimos confirmar la creación de la solicitud.')
  if (creada.idBoveda !== idBoveda) throw new ApiError('No pudimos confirmar la creación de la solicitud.', status, SIN_CONFIRMAR)
  return creada
}

/** SMV-04 · Body `{}`. Ejecuta el movimiento: responde los movimientos registrados en cada bóveda */
export async function aprobarSolicitudMovimiento(idSolicitud: number) {
  const { data, status } = await apiClient.post<unknown>(BOVEDAS_ENDPOINTS.aprobarSolicitud(idSolicitud), {})
  return confirmar(movimientosEjecutadosSchema, data, status, 'No pudimos confirmar la aprobación de la solicitud.')
}

async function resolverSolicitud(url: string, idSolicitud: number, motivo: string, mensaje: string) {
  const body = motivoResolucionSchema.parse({ motivo })
  const { data, status } = await apiClient.post<unknown>(url, body)
  const solicitud = confirmar(solicitudMovimientoSchema, data, status, mensaje)
  if (solicitud.idSolicitudMovimiento !== idSolicitud) throw new ApiError(mensaje, status, SIN_CONFIRMAR)
  return solicitud
}

/** SMV-05 · Rechazo con motivo obligatorio */
export const rechazarSolicitudMovimiento = (idSolicitud: number, motivo: string) =>
  resolverSolicitud(BOVEDAS_ENDPOINTS.rechazarSolicitud(idSolicitud), idSolicitud, motivo, 'No pudimos confirmar el rechazo de la solicitud.')

/** SMV-06 · Cancelación con motivo obligatorio */
export const cancelarSolicitudMovimiento = (idSolicitud: number, motivo: string) =>
  resolverSolicitud(BOVEDAS_ENDPOINTS.cancelarSolicitud(idSolicitud), idSolicitud, motivo, 'No pudimos confirmar la cancelación de la solicitud.')

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
 * Mensaje general de un error de BOV-05, BOV-06 o SMV-01, SMV-04 a SMV-06; los errores por campo se
 * muestran junto a cada campo. `seguroReintentar`: el reintento no duplica la operación (SMV-01 con
 * la misma clave).
 */
export function mensajeErrorOperacion(error: unknown, que: string, seguroReintentar = false) {
  const e = toApiError(error)
  if (e.status === 403) return `Tu rol no tiene permiso para ${que}.`
  if (e.status === 404) return e.message || 'No encontramos la bóveda, el arqueo o la solicitud. Puede que ya no exista.'
  if (e.status === 429) return 'Hiciste demasiados intentos seguidos. Espera un momento y vuelve a intentarlo.'
  if (operacionSinConfirmar(error)) {
    return seguroReintentar
      ? 'No pudimos confirmar si quedó registrado. Puedes reintentar sin cambiar nada: no se registrará dos veces.'
      : 'No pudimos confirmar si quedó registrado. Actualiza la pantalla y revisa antes de volver a intentarlo.'
  }
  if ((e.status === 400 || e.status === 422) && e.fields.length > 0) return 'Revisa los campos marcados.'
  // 409 (p. ej. piezas insuficientes, arqueo o solicitud ya resueltos, aprobar la propia solicitud)
  // trae un detalle legible del backend
  return e.message
}
