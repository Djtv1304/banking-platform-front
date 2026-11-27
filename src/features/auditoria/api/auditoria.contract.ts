import { z } from 'zod'

// --- Tipos de evento (GET /tipos-evento) ---
export const tipoEventoSchema = z.object({
  codigo: z.string(),
  modulo: z.string(),
  severidad: z.string(),
})
export type TipoEvento = z.infer<typeof tipoEventoSchema>
export const tiposEventoSchema = z.array(tipoEventoSchema)

// --- Evento en listado ---
export const eventoItemSchema = z.object({
  id: z.number().int(),
  idEvento: z.string().nullable(),
  codigoEvento: z.string().nullable(),
  modulo: z.string().nullable(),
  severidad: z.enum(['Informativo', 'Sensible', 'Seguridad']).nullable(),
  fechaHoraUtc: z.string().nullable(),
  fechaHoraLocal: z.string().nullable(),
  usuario: z.number().int().nullable(),
  nombreUsuario: z.string().nullable(),
  agencia: z.string().nullable(),
  canal: z.string().nullable(),
  origen: z.string().nullable(),
  resultado: z.string().nullable(),
  tipoObjetivo: z.string().nullable(),
  idObjetivo: z.string().nullable(),
  correlacion: z.string().nullable(),
  descripcion: z.string().nullable(),
  formatoAnterior: z.boolean(),
})
export type EventoItem = z.infer<typeof eventoItemSchema>

// --- Página de eventos (búsqueda y objetivos) ---
export const paginaEventosSchema = z.object({
  items: z.array(eventoItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
})
export type PaginaEventos = z.infer<typeof paginaEventosSchema>

// --- Aprobación incrustada en el detalle ---
const responsableAprobacionSchema = z.object({
  nombre: z.string().nullable(),
  idInterno: z.number().int().nullable(),
})

const aprobacionEventoSchema = z.object({
  idSolicitud: z.number().int(),
  operacion: z.string().nullable(),
  estado: z.string().nullable(),
  solicitante: responsableAprobacionSchema.nullable(),
  fechaSolicitud: z.string().nullable(),
  aprobador: responsableAprobacionSchema.nullable(),
  fechaResolucion: z.string().nullable(),
})

// --- Detalle de un evento (GET /eventos/{idEvento}) ---
export const detalleEventoSchema = eventoItemSchema.extend({
  cambios: z.unknown().nullable(),
  aprobacion: aprobacionEventoSchema.nullable(),
  relacionados: z.array(eventoItemSchema),
})
export type DetalleEvento = z.infer<typeof detalleEventoSchema>

// --- Filtros de búsqueda (POST body) ---
export interface FiltrosBusqueda {
  desde: string
  hasta: string
  usuario?: number
  agencia?: string
  modulo?: string
  codigoEvento?: string
  resultado?: 'Exitoso' | 'Fallido'
  tipoObjetivo?: string
  idObjetivo?: string
  origen?: string
  canal?: string
  correlacion?: string
  idSolicitud?: number
  page: number
  pageSize: number
}

export interface FiltrosExportacion extends Omit<FiltrosBusqueda, 'page' | 'pageSize'> {
  formato: 'csv' | 'pdf'
}

// --- E8-02 · Integridad de la bitácora (POST/GET /verificaciones) ---
export const verificacionSchema = z.object({
  idVerificacion: z.number().int(),
  secuenciaDesde: z.number().int(),
  secuenciaHasta: z.number().int(),
  resultado: z.enum(['Integra', 'Rota']),
  primeraRota: z.number().int().nullable(),
  /** null = tarea nocturna */
  ejecutadaPor: z.number().int().nullable(),
  fechaUtc: z.string(),
})
export type Verificacion = z.infer<typeof verificacionSchema>
export const paginaVerificacionesSchema = z.object({
  items: z.array(verificacionSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
})
