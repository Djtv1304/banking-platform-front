import { z } from 'zod'

/*
 * Contrato de Organización · Agencias (ORG-01 y ORG-02) en camelCase. Solo ADMIN.
 *
 * La lista sale del catálogo (CAT-06, `useAgencias` de catalogos); aquí van el detalle, el alta y
 * la edición. No hay DELETE: la baja es lógica por estado. Los bodies rechazan campos desconocidos
 * (400): se envían solo los campos que se definen.
 */

export const AGENCIAS_ENDPOINTS = {
  crear: '/api/v1/agencias',
  /** GET (detalle) y PATCH (ORG-02) */
  agencia: (idAgencia: string) => `/api/v1/agencias/${encodeURIComponent(idAgencia)}`,
} as const

export const tipoAgenciaSchema = z.enum(['Matriz', 'Sucursal'])

/** `A` activa, `I` inactiva, `C` cerrada (la API no llega a `C` ni sale de él) */
export const estadoAgenciaSchema = z.enum(['A', 'I', 'C'])

/** Respuesta del detalle, de ORG-01 (201) y de ORG-02 (200). El valor de KeyAgencia no se publica */
export const agenciaDetalleSchema = z.object({
  idAgencia: z.string(),
  codigo: z.string(),
  tipoAgencia: tipoAgenciaSchema,
  estado: estadoAgenciaSchema,
  idCiudad: z.number(),
  telefono: z.string().nullish(),
  direccion: z.string().nullish(),
  fechaCreacion: z.string(),
  vinculadaWorkos: z.boolean(),
})

export type TipoAgencia = z.infer<typeof tipoAgenciaSchema>
export type EstadoAgencia = z.infer<typeof estadoAgenciaSchema>
export type AgenciaDetalle = z.infer<typeof agenciaDetalleSchema>

/** ORG-01 · `idAgencia` lo elige el administrador y no cambia nunca */
export interface AgenciaCreate {
  idAgencia: string
  codigo: string
  tipoAgencia: TipoAgencia
  idCiudad: number
  telefono?: string
  direccion?: string
}

/** ORG-02 · Parcial: solo los campos presentes cambian. `null` borra un opcional. `motivo` es obligatorio si cambia `estado` */
export interface AgenciaUpdate {
  codigo?: string
  tipoAgencia?: TipoAgencia
  idCiudad?: number
  telefono?: string | null
  direccion?: string | null
  estado?: 'A' | 'I'
  motivo?: string
}
