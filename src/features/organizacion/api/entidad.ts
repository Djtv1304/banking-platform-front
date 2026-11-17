import { z } from 'zod'
import { ApiError, apiClient, toApiError } from '@/shared/api'
import { hasPermission, PERMISOS } from '@/shared/lib'

export const ENTIDAD_ENDPOINT = '/api/v1/organizacion/entidad'
export const ENTIDAD_KEY = ['organizacion', 'entidad'] as const

// PR backend #323. Los datos de respuesta se conservan aunque su formato sea legado.
export const entidadSchema = z.object({
  idEntidad: z.literal(1),
  ruc: z.string(),
  razonSocial: z.string(),
  nombreComercial: z.string().nullable(),
  tipoOrganizacion: z.string(),
  segmento: z.number().int().min(1).max(5).nullable(),
  numeroResolucionSeps: z.string().nullable(),
  fechaConstitucion: z.iso.date(),
  representanteLegal: z.string(),
  identificacionRepresentante: z.string(),
  telefono: z.string().nullable(),
  email: z.string().nullable(),
  sitioWeb: z.string().nullable(),
  estado: z.enum(['A', 'I']),
  fechaRegistro: z.iso.datetime({
    local: true
  }).or(z.iso.datetime({
    offset: true
  })),
  modificadoPor: z.number().int()
})

export type Entidad = z.infer<typeof entidadSchema>

// Subconjunto editable por esta pantalla: estado y auditoría son informativos.
const camposEntidadSchema = z.object({
  ruc: z.string().regex(/^[0-9]{10}001$/),
  razonSocial: z.string().trim().min(1).max(250),
  nombreComercial: z.string().max(150).nullable(),
  tipoOrganizacion: z.string().trim().min(1).max(60),
  segmento: z.number().int().min(1).max(5).nullable(),
  numeroResolucionSeps: z.string().max(60).nullable(),
  fechaConstitucion: z.iso.date(),
  representanteLegal: z.string().trim().min(1).max(250),
  identificacionRepresentante: z.string().regex(/^[0-9A-Z]{5,13}$/),
  telefono: z.string().max(15).nullable(),
  email: z.string().max(150).nullable(),
  sitioWeb: z.string().max(150).nullable()
})

export const entidadPatchSchema = camposEntidadSchema.partial().strict()
  .refine(v => Object.keys(v).length > 0, 'No hay cambios para guardar.')

// Contrato EntidadCreate de develop (PR #335). El estado inicial se omite:
// backend aplica A; identificador, fecha y autor no se envían desde esta pantalla.
export const entidadCreateSchema = camposEntidadSchema.partial().required({
  ruc: true,
  razonSocial: true,
  fechaConstitucion: true,
  representanteLegal: true,
  identificacionRepresentante: true,
}).strict()

export type EntidadPatch = z.infer<typeof entidadPatchSchema>
export type EntidadCreate = z.infer<typeof entidadCreateSchema>

function respuestaEntidad(data: unknown, status: number, esperado = 200) {
  const result = entidadSchema.safeParse(data)
  if (status !== esperado || !result.success) {
    throw new ApiError('No pudimos confirmar los datos de la cooperativa recibidos del servidor.', status, 'respuesta_invalida')
  }
  return result.data
}

export async function obtenerEntidad(signal?: AbortSignal) {
  const {
    data,
    status
  } = await apiClient.get<unknown>(ENTIDAD_ENDPOINT, {
    signal
  })
  return respuestaEntidad(data, status)
}

export async function editarEntidad(cambios: EntidadPatch) {
  const body = entidadPatchSchema.parse(cambios)
  const {
    data,
    status
  } = await apiClient.patch<unknown>(ENTIDAD_ENDPOINT, body)
  return respuestaEntidad(data, status)
}

export async function crearEntidad(datos: EntidadCreate) {
  const body = entidadCreateSchema.parse(datos)
  const { data, status } = await apiClient.post<unknown>(ENTIDAD_ENDPOINT, body)
  return respuestaEntidad(data, status, 201)
}

export function esEntidadAusente(error: unknown) {
  return error instanceof ApiError && error.status === 404 && error.code === 'ENTIDAD_NO_ENCONTRADA'
}

/** Un error de permisos, transporte u otro 404 no significa que podamos crear. */
export async function consultarExistenciaEntidad() {
  try {
    return await obtenerEntidad()
  } catch (error) {
    if (esEntidadAusente(error)) return null
    throw error
  }
}

/** Consultar por rol; crear o editar los datos exige organizacion:editar */
export function accesoEntidad(roles: readonly string[], permisos: readonly string[] = []) {
  const lista = roles.map(rol => rol.trim().toUpperCase())
  return {
    consulta: lista.some(rol => ['ADMIN', 'ASESOR'].includes(rol)),
    edicion: hasPermission(permisos, PERMISOS.organizacionEditar)
  }
}

export function mensajeErrorEntidad(error: unknown, guardando = false) {
  const e = toApiError(error)
  if (e.status === 403) return 'No tienes permiso para realizar esta acción sobre la cooperativa.'
  if (guardando && (e.status === null || e.status >= 500 || e.code === 'respuesta_invalida')) {
    return 'No pudimos confirmar el guardado. Tu borrador se conserva; puedes reintentar los mismos cambios.'
  }
  return e.message
}
