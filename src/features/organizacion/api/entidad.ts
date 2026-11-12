import { z } from 'zod'
import { ApiError, apiClient, toApiError } from '@/shared/api'

export const ENTIDAD_ENDPOINT = '/api/v1/organizacion/entidad'
export const ENTIDAD_KEY = ['organizacion', 'entidad'] as const

// PR backend #323. Los datos de respuesta se conservan aunque su formato sea legado.
export const entidadSchema = z.object({
  idEntidad: z.literal(1), ruc: z.string(), razonSocial: z.string(),
  nombreComercial: z.string().nullable(), tipoOrganizacion: z.string(),
  segmento: z.number().int().min(1).max(5).nullable(), numeroResolucionSeps: z.string().nullable(),
  fechaConstitucion: z.iso.date(), representanteLegal: z.string(), identificacionRepresentante: z.string(),
  telefono: z.string().nullable(), email: z.string().nullable(), sitioWeb: z.string().nullable(),
  estado: z.enum(['A', 'I']), fechaRegistro: z.iso.datetime({ local: true }).or(z.iso.datetime({ offset: true })),
  modificadoPor: z.number().int(),
})
export type Entidad = z.infer<typeof entidadSchema>

// Subconjunto editable por esta pantalla: estado y auditoría son informativos.
export const entidadPatchSchema = z.object({
  ruc: z.string().regex(/^[0-9]{10}001$/), razonSocial: z.string().trim().min(1).max(250),
  nombreComercial: z.string().max(150).nullable(), tipoOrganizacion: z.string().trim().min(1).max(60),
  segmento: z.number().int().min(1).max(5).nullable(), numeroResolucionSeps: z.string().max(60).nullable(),
  fechaConstitucion: z.iso.date(), representanteLegal: z.string().trim().min(1).max(250),
  identificacionRepresentante: z.string().regex(/^[0-9A-Z]{5,13}$/),
  telefono: z.string().max(15).nullable(), email: z.string().max(150).nullable(), sitioWeb: z.string().max(150).nullable(),
}).partial().strict().refine((v) => Object.keys(v).length > 0, 'No hay cambios para guardar.')
export type EntidadPatch = z.infer<typeof entidadPatchSchema>

function respuestaEntidad(data: unknown, status: number) {
  const result = entidadSchema.safeParse(data)
  if (status !== 200 || !result.success) {
    throw new ApiError('No pudimos confirmar los datos de la cooperativa recibidos del servidor.', status, 'respuesta_invalida')
  }
  return result.data
}

export async function obtenerEntidad(signal?: AbortSignal) {
  const { data, status } = await apiClient.get<unknown>(ENTIDAD_ENDPOINT, { signal })
  return respuestaEntidad(data, status)
}

export async function editarEntidad(cambios: EntidadPatch) {
  const body = entidadPatchSchema.parse(cambios)
  const { data, status } = await apiClient.patch<unknown>(ENTIDAD_ENDPOINT, body)
  return respuestaEntidad(data, status)
}

export function accesoEntidad(roles: readonly string[]) {
  const lista = roles.map((rol) => rol.trim().toUpperCase())
  return { consulta: lista.some((rol) => ['ADMIN', 'ASESOR'].includes(rol)), edicion: lista.includes('ADMIN') }
}

export function mensajeErrorEntidad(error: unknown, guardando = false) {
  const e = toApiError(error)
  if (e.status === 403) return 'No tienes permiso para realizar esta acción sobre la cooperativa.'
  if (guardando && (e.status === null || e.status >= 500 || e.code === 'respuesta_invalida')) {
    return 'No pudimos confirmar el guardado. Tu borrador se conserva; puedes reintentar los mismos cambios.'
  }
  return e.message
}
