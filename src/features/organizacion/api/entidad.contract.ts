import { z } from 'zod'

/*
 * Contrato de la entidad (la cooperativa) en camelCase.
 *
 * - GET   …/organizacion/entidad → datos de la entidad (ASESOR y ADMIN) · 404 ENTIDAD_NO_ENCONTRADA
 * - PATCH …/organizacion/entidad → edición parcial (ADMIN) · 400 DATOS_INVALIDOS · 404 ENTIDAD_NO_ENCONTRADA
 *
 * Rutas PROVISIONALES: el router de organización del backend tiene `prefix="/agencias"`, así que la
 * entidad quedó montada en `/api/v1/agencias/organizacion/entidad` y no en `/api/v1/organizacion/entidad`.
 * Cuando el backend lo corrija (issue #326 de Banking-Platform) basta con cambiar esta constante.
 */
export const ENTIDAD_ENDPOINT = '/api/v1/agencias/organizacion/entidad'

/** A = Activa, I = Inactiva */
export const ESTADOS_ENTIDAD = ['A', 'I'] as const
export type EstadoEntidad = (typeof ESTADOS_ENTIDAD)[number]

export const entidadSchema = z.object({
  idEntidad: z.number(),
  ruc: z.string(),
  razonSocial: z.string(),
  nombreComercial: z.string().nullable(),
  tipoOrganizacion: z.string(),
  /** Segmento SEPS, entero de 1 a 5 */
  segmento: z.number().int().nullable(),
  numeroResolucionSeps: z.string().nullable(),
  /** `YYYY-MM-DD` */
  fechaConstitucion: z.string(),
  representanteLegal: z.string(),
  identificacionRepresentante: z.string(),
  telefono: z.string().nullable(),
  email: z.string().nullable(),
  sitioWeb: z.string().nullable(),
  estado: z.enum(ESTADOS_ENTIDAD),
  /** ISO con hora */
  fechaRegistro: z.string(),
  /** Id interno del usuario que hizo el último cambio */
  modificadoPor: z.number(),
})

export type Entidad = z.infer<typeof entidadSchema>

/**
 * Body del PATCH (`extra="forbid"`, al menos un campo). Omitir un campo lo conserva; `null` solo vale
 * en los anulables, que son los que tienen `| null` aquí.
 */
export interface EntidadUpdate {
  ruc?: string
  razonSocial?: string
  nombreComercial?: string | null
  tipoOrganizacion?: string
  segmento?: number | null
  numeroResolucionSeps?: string | null
  fechaConstitucion?: string
  representanteLegal?: string
  identificacionRepresentante?: string
  telefono?: string | null
  email?: string | null
  sitioWeb?: string | null
  estado?: EstadoEntidad
}
