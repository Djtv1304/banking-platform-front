import type { z } from 'zod'
import { ApiError, apiClient } from '@/shared/api'
import { entradaSchema, listaSchema, parametroSchema, pendienteSchema, registradoSchema, type EntradaValor } from '@/features/parametros/api/parametros.contract'

export interface FiltrosParametros { buscar?: string; modulo?: string; estado?: string; idAgencia?: string; page?: number }
const base = '/api/v1/parametros'
function validar<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data)
  if (!r.success) throw new ApiError('La respuesta del servicio de parametros no es valida.', null, 'respuesta_invalida')
  return r.data
}
export async function listarParametros(filtros: FiltrosParametros, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>(base, { params: filtros, signal })
  return validar(listaSchema, data)
}
export async function consultarParametro(clave: string, idAgencia: string | null, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>(`${base}/${encodeURIComponent(clave)}`, { params: idAgencia ? { idAgencia } : {}, signal })
  return validar(parametroSchema, data)
}
export async function programarValor(clave: string, entrada: EntradaValor) {
  const { data, status } = await apiClient.post<unknown>(`${base}/${encodeURIComponent(clave)}/valores`, entradaSchema.parse(entrada))
  if (status === 202) return { tipo: 'pendiente' as const, ...validar(pendienteSchema, data) }
  if (status === 201) return { tipo: 'registrado' as const, ...validar(registradoSchema, data) }
  throw new ApiError('El servidor no confirmo el registro ni una solicitud de aprobacion.', status, 'respuesta_invalida')
}
export async function cancelarValor(clave: string, id: number, agencia: string | null) {
  await apiClient.delete(`${base}/${encodeURIComponent(clave)}/valores/${id}`, { params: agencia ? { idAgencia: agencia } : {} })
}
