import { z } from 'zod'

const BASE = '/api/v1/organizacion/agencias'

export const AGENCIAS_ENDPOINTS = {
  lista: BASE,
  agencia: (id: string) => `${BASE}/${encodeURIComponent(id)}`,
  estado: (id: string) => `${BASE}/${encodeURIComponent(id)}/estado`,
} as const

export const tipoAgenciaSchema = z.enum(['Matriz', 'Sucursal'])

/** `A` activa, `I` inactiva, `C` cerrada (la API no llega a `C` ni sale de él) */
export const estadoAgenciaSchema = z.enum(['A', 'I', 'C'])

export const agenciaEstadoSchema = z.object({
  idAgencia: z.string().min(1),
  estado: estadoAgenciaSchema,
})

export interface AgenciaEstadoUpdate {
  estado: 'A' | 'I'
  motivo: string
}

/** Respuesta del detalle, de ORG-01 (201) y de ORG-02 (200). El valor de KeyAgencia no se publica */
export const agenciaDetalleSchema = z.object({
  idAgencia: z.string().trim().min(1),
  codigo: z.string(),
  tipoAgencia: tipoAgenciaSchema,
  estado: estadoAgenciaSchema,
  idCiudad: z.number().int().positive(),
  telefono: z.string().nullish(),
  direccion: z.string().nullish(),
  fechaCreacion: z.string(),
  vinculadaWorkos: z.boolean(),
})

export type TipoAgencia = z.infer<typeof tipoAgenciaSchema>
export type EstadoAgencia = z.infer<typeof estadoAgenciaSchema>
export type AgenciaDetalle = z.infer<typeof agenciaDetalleSchema>

/** ORG-01 · Backend genera `idAgencia` y lo devuelve en la respuesta. */
export interface AgenciaCreate {
  codigo: string
  tipoAgencia: TipoAgencia
  idCiudad: number
  telefono?: string
  direccion?: string
}

/** ORG-02 · Parcial: solo los campos presentes cambian. `null` borra un opcional. */
export interface AgenciaUpdate {
  codigo?: string
  tipoAgencia?: TipoAgencia
  idCiudad?: number
  telefono?: string | null
  direccion?: string | null
}
