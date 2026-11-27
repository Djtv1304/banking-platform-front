import type { z } from 'zod'

import { ApiError, apiClient, toApiError } from '@/shared/api'
import {
  abrirJornadaSchema,
  CAJA_ENDPOINTS,
  cajaFisicaSchema,
  dotacionSchema,
  jornadaSchema,
  paginaMovimientosCajaSchema,
  type AbrirJornada,
} from '@/features/caja/api/caja.contract'

const RESPUESTA_INVALIDA = 'No pudimos leer la respuesta del servidor. Inténtalo más tarde.'
const SIN_CONFIRMAR = 'sin_confirmar'

function validar<T extends z.ZodType>(schema: T, data: unknown, status: number): z.infer<T> {
  const result = schema.safeParse(data)
  if (!result.success) throw new ApiError(RESPUESTA_INVALIDA, status, 'respuesta_invalida')
  return result.data
}

/** CAJ-01 · Ventanillas activas de la agencia del cajero (el backend aplica el alcance de agencia) */
export async function listarCajasFisicas(signal?: AbortSignal) {
  const { data, status } = await apiClient.get<unknown>(CAJA_ENDPOINTS.cajasFisicas, { params: { activa: 'true' }, signal })
  return validar(cajaFisicaSchema.array(), data, status)
}

/** CAJ-04 · Jornada abierta del cajero; `null` si no tiene (404 SIN_JORNADA_ABIERTA) */
export async function obtenerJornadaActual(signal?: AbortSignal) {
  try {
    const { data, status } = await apiClient.get<unknown>(CAJA_ENDPOINTS.jornadaActual, { signal })
    return validar(jornadaSchema, data, status)
  } catch (error) {
    const e = toApiError(error)
    if (e.status === 404 && e.code === 'SIN_JORNADA_ABIERTA') return null
    throw error
  }
}

/** CAJ-08 · Dotaciones recibidas en la jornada */
export async function listarDotaciones(idJornada: number, signal?: AbortSignal) {
  const { data, status } = await apiClient.get<unknown>(CAJA_ENDPOINTS.dotaciones(idJornada), { signal })
  return validar(dotacionSchema.array(), data, status)
}

/** CAJ-12 · Últimos movimientos de la jornada, del más reciente al más antiguo */
export async function listarUltimosMovimientos(idJornada: number, pageSize: number, signal?: AbortSignal) {
  const params = { page: '1', pageSize: String(pageSize), sort: 'fechaHora,desc' }
  const { data, status } = await apiClient.get<unknown>(CAJA_ENDPOINTS.movimientos(idJornada), { params, signal })
  return validar(paginaMovimientosCajaSchema, data, status)
}

/**
 * CAJ-03 · Nunca se reintenta solo: una respuesta perdida no prueba que la jornada no se haya abierto.
 * Sin `observacion` no se envía la clave (el backend rechaza campos vacíos o desconocidos).
 */
export async function abrirJornada(apertura: AbrirJornada) {
  const body = abrirJornadaSchema.parse(apertura)
  const { data, status } = await apiClient.post<unknown>(CAJA_ENDPOINTS.jornadas, body)
  const result = jornadaSchema.safeParse(data)
  if (status !== 201 || !result.success || result.data.idCajaFisica !== apertura.idCajaFisica) {
    throw new ApiError('No pudimos confirmar la apertura de la jornada.', status, SIN_CONFIRMAR)
  }
  return result.data
}

/** Sin respuesta clara (red, 5xx o una respuesta que no se pudo leer): no se sabe si la jornada quedó abierta */
export function operacionSinConfirmar(error: unknown) {
  const e = toApiError(error)
  return e.status === null || e.status >= 500 || e.code === SIN_CONFIRMAR
}

/** Códigos de negocio de la jornada (CAJ-03 a CAJ-12) con un texto que dice qué hacer */
const MENSAJES_CODIGO: Record<string, string> = {
  CAJA_EN_USO: 'Esa ventanilla ya tiene una jornada abierta. Elige otra ventanilla libre.',
  CAJA_INACTIVA: 'Esa ventanilla está inactiva. Elige otra o pide a tu supervisor que la active.',
  CAJA_FISICA_NO_ENCONTRADA: 'La ventanilla elegida ya no existe. Actualiza la lista y elige otra.',
  CAJERO_YA_TIENE_JORNADA_ABIERTA: 'Ya tienes una jornada abierta. Actualiza la pantalla para verla.',
  CAJERO_NO_ASIGNADO_A_AGENCIA: 'No tienes asignación vigente en la agencia de esa ventanilla. Pide a tu supervisor que te asigne.',
  SIN_JORNADA_ABIERTA: 'No tienes una jornada abierta.',
  JORNADA_NO_ENCONTRADA: 'No encontramos la jornada. Puede que ya no exista o que no sea tuya.',
  USUARIO_INTERNO_NO_VINCULADO: 'Tu usuario todavía no está habilitado para operar en caja. Pide a quien administra los accesos que lo vincule.',
  USUARIO_NO_REGISTRADO: 'Tu usuario todavía no está registrado en la cooperativa. Pide a quien administra los accesos que lo habilite.',
  AGENCIA_NO_ASIGNADA: 'No tienes una agencia asignada. Pide a tu supervisor que te asigne a una.',
  SIN_ACCESO_AGENCIA: 'No tienes acceso a la agencia de esa ventanilla. Pide a tu supervisor que revise tu asignación.',
  CONTEXTO_AGENCIA_DESACTUALIZADO: 'Cambió tu agencia de trabajo. Recarga la pantalla y vuelve a intentarlo.',
}

/**
 * Mensaje de un error de la ventanilla. `que` completa «Tu rol no tiene permiso para …»; `escritura`
 * avisa que, sin respuesta clara, no se sabe si la operación quedó hecha.
 */
export function mensajeErrorCaja(error: unknown, que: string, escritura = false) {
  const e = toApiError(error)
  const porCodigo = MENSAJES_CODIGO[e.code]
  if (porCodigo) return porCodigo
  if (e.status === 403) return `Tu rol no tiene permiso para ${que}.`
  if (e.status === 429) return 'Hiciste demasiados intentos seguidos. Espera un momento y vuelve a intentarlo.'
  if (operacionSinConfirmar(error)) {
    return escritura
      ? 'No pudimos confirmar si la jornada quedó abierta. Actualiza la pantalla y revisa antes de volver a intentarlo.'
      : 'No pudimos conectar con el servidor. Inténtalo de nuevo en un momento.'
  }
  if ((e.status === 400 || e.status === 422) && e.fields.length > 0) return 'Revisa los campos marcados.'
  // 409 u otros 4xx traen un detalle legible del backend
  return e.message
}
