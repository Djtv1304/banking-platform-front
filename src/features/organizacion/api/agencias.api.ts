import { z } from 'zod'

import { aceptadaSchema, ApiError, apiClient } from '@/shared/api'
import {
  AGENCIAS_ENDPOINTS,
  agenciaDetalleSchema,
  agenciaEstadoSchema,
  type AgenciaCreate,
  type AgenciaEstadoUpdate,
  type AgenciaUpdate,
} from '@/features/organizacion/api/agencias.contract'

function validar<T>(schema: z.ZodType<T>, data: unknown, status: number) {
  const result = schema.safeParse(data)
  if (!result.success) throw new ApiError('No pudimos leer la respuesta del servidor.', status, 'respuesta_invalida')
  return result.data
}

export async function listarAgencias(signal?: AbortSignal) {
  const { data, status } = await apiClient.get<unknown>(AGENCIAS_ENDPOINTS.lista, { signal })
  return validar(z.array(agenciaDetalleSchema), data, status)
}

export async function obtenerAgencia(idAgencia: string, signal?: AbortSignal) {
  const { data, status } = await apiClient.get<unknown>(AGENCIAS_ENDPOINTS.agencia(idAgencia), { signal })
  return validar(agenciaDetalleSchema, data, status)
}

export async function crearAgencia(body: AgenciaCreate) {
  const { data, status } = await apiClient.post<unknown>(AGENCIAS_ENDPOINTS.lista, body)
  return validar(agenciaDetalleSchema, data, status)
}

export async function actualizarAgencia(idAgencia: string, body: AgenciaUpdate) {
  const { data, status } = await apiClient.patch<unknown>(AGENCIAS_ENDPOINTS.agencia(idAgencia), body)
  return validar(agenciaDetalleSchema, data, status)
}

export async function cambiarEstadoAgencia(idAgencia: string, body: AgenciaEstadoUpdate) {
  const { data, status } = await apiClient.patch<unknown>(AGENCIAS_ENDPOINTS.estado(idAgencia), body)
  if (status === 202) return validar(aceptadaSchema, data, status)
  return validar(agenciaEstadoSchema, data, status)
}
