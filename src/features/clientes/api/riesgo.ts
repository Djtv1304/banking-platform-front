import { z } from 'zod'
import { aceptadaSchema, ApiError, apiClient } from '@/shared/api'
import { hasPermission, PERMISOS } from '@/shared/lib'

export const NIVELES_LAFT = ['Bajo', 'Medio', 'Alto'] as const
export const RESULTADOS_RIESGO = ['Aprobado', 'Observado', 'Rechazado'] as const

export const riesgoCreateSchema = z.object({
  nivelRiesgoLAFT: z.enum(NIVELES_LAFT, { error: 'Selecciona el nivel de riesgo.' }),
  esPEP: z.boolean(),
  resultadoEvaluacion: z.enum(RESULTADOS_RIESGO, { error: 'Selecciona el resultado.' }),
  tieneAntecedentes: z.boolean(),
  idTipoAntecedente: z.number().int().positive().nullable(),
  observaciones: z.string().trim().max(250, 'Usa hasta 250 caracteres.').nullable(),
}).superRefine((datos, contexto) => {
  if (datos.tieneAntecedentes !== (datos.idTipoAntecedente !== null)) {
    contexto.addIssue({ code: 'custom', path: ['idTipoAntecedente'], message: 'Selecciona un tipo solo cuando existan antecedentes.' })
  }
})

export const riesgoSchema = z.object({
  ...riesgoCreateSchema.shape,
  idEvaluacion: z.number().int().positive(),
  idCliente: z.number().int().positive(),
  fechaEvaluacion: z.iso.datetime({ offset: true }).or(z.iso.datetime({ local: true })),
  evaluador: z.number().int(),
  esVigente: z.boolean(),
  vigenteHasta: z.iso.date().nullable().optional(),
  idSolicitud: z.number().int().positive().nullable().optional(),
})

export const registradoSchema = riesgoSchema.safeExtend({ estadoCliente: z.string().min(1) })

export const tipoAntecedenteSchema = z.object({
  idTipoAntecedente: z.number().int().positive(),
  nombre: z.string(),
  categoria: z.enum(['EnRevision', 'Critico']),
  puedeImpedirVinculacion: z.boolean(),
})

export type RiesgoCreate = z.infer<typeof riesgoCreateSchema>
export type Riesgo = z.infer<typeof riesgoSchema>
export type RiesgoRegistrado = z.infer<typeof registradoSchema>
export type TipoAntecedente = z.infer<typeof tipoAntecedenteSchema>

export type ResultadoEvaluacionRiesgo =
  | { tipo: 'registrada'; evaluacion: RiesgoRegistrado }
  | { tipo: 'solicitud'; idSolicitud: number }

export const riesgoKey = (id: number) => ['clientes', 'riesgo', id] as const
const endpoint = (id: number) => `/api/v1/clientes/${id}/evaluaciones-riesgo`

function validar<T extends z.ZodType>(schema: T, data: unknown, status: number): z.infer<T> {
  const resultado = schema.safeParse(data)
  if (!resultado.success) throw new ApiError('No pudimos leer la respuesta del servidor.', status, 'respuesta_invalida')
  return resultado.data
}

export async function listarRiesgos(id: number, signal?: AbortSignal) {
  const { data, status } = await apiClient.get<unknown>(endpoint(id), { signal })
  const lista = validar(z.array(riesgoSchema), data, status)
  if (lista.some((fila) => fila.idCliente !== id)) throw new ApiError('La evaluación recibida pertenece a otro cliente.', status, 'respuesta_invalida')
  return lista
}

export async function registrarEvaluacion(id: number, entrada: RiesgoCreate): Promise<ResultadoEvaluacionRiesgo> {
  const body = riesgoCreateSchema.parse(entrada)
  const { data, status } = await apiClient.post<unknown>(endpoint(id), body)
  if (status === 202) {
    const solicitud = validar(aceptadaSchema, data, status)
    return { tipo: 'solicitud', idSolicitud: solicitud.idSolicitud }
  }
  if (status !== 201) {
    throw new ApiError('Comprueba el historial antes de volver a registrar la evaluación.', status, 'respuesta_invalida')
  }
  const evaluacion = validar(registradoSchema, data, status)
  if (evaluacion.idCliente !== id) {
    throw new ApiError('Comprueba el historial antes de volver a registrar la evaluación.', status, 'respuesta_invalida')
  }
  return { tipo: 'registrada', evaluacion }
}


export async function listarTiposAntecedente(signal?: AbortSignal) {
  const { data, status } = await apiClient.get<unknown>('/api/v1/catalogos/tipos-antecedente', { signal })
  return validar(z.array(tipoAntecedenteSchema), data, status)
}

/** Ver el historial por rol; registrar una evaluación exige clientes:riesgo */
export function accesoRiesgo(roles: readonly string[], permisos: readonly string[] = []) {
  const normalizados = roles.map((rol) => rol.trim().toUpperCase())
  return {
    registro: hasPermission(permisos, PERMISOS.clientesRiesgo),
    historial: normalizados.some((rol) => ['ASESOR', 'SUPERVISOR', 'ADMIN', 'AUDITOR'].includes(rol)),
  }
}

export function fechaRiesgoVisible(fecha: string) {
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(fecha)) return `${fecha.replace('T', ' ')} (sin zona informada)`
  return `${new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guayaquil' }).format(new Date(fecha))} (Ecuador)`
}

/** Formatea la validez de la evaluación vigente: "Vigente hasta dd/mm/aaaa" o "Vencida" */
export function validezEvaluacion(vigenteHasta: string | null | undefined, fechaReferencia: Date = new Date()): string | null {
  if (!vigenteHasta) return null
  const partes = vigenteHasta.slice(0, 10).split('-')
  if (partes.length !== 3) return null
  const [año, mes, dia] = partes
  const fechaFin = new Date(Number(año), Number(mes) - 1, Number(dia), 23, 59, 59, 999)
  if (fechaReferencia.getTime() > fechaFin.getTime()) {
    return 'Vencida'
  }
  return `Vigente hasta ${dia}/${mes}/${año}`
}

/** Formatea una fecha YYYY-MM-DD en dd/mm/aaaa para columnas o "—" si es nula */
export function formatearFechaVigencia(fecha: string | null | undefined): string {
  if (!fecha) return '—'
  const partes = fecha.slice(0, 10).split('-')
  if (partes.length !== 3) return fecha
  const [año, mes, dia] = partes
  return `${dia}/${mes}/${año}`
}
