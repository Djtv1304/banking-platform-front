import { z } from 'zod'

export const estadoSolicitudSchema = z.enum(['Pendiente', 'Aprobada', 'Ejecutada', 'Rechazada', 'Cancelada', 'Fallida'])
const responsableSchema = z.object({ sujeto: z.string(), nombre: z.string().nullable(), idInterno: z.number().int().nullable() })
export const solicitudSchema = z.object({
  idSolicitud: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  codigoTransaccion: z.string(), tipoObjetivo: z.string(), idObjetivo: z.string(), idAgencia: z.string().nullable(),
  estado: estadoSolicitudSchema, fechaSolicitud: z.string(), solicitante: responsableSchema,
  resolutor: responsableSchema.nullable(), fechaResolucion: z.string().nullable(), comentario: z.string().nullable(), codigoError: z.string().nullable(),
  puedeAprobar: z.boolean(), puedeRechazar: z.boolean(), puedeCancelar: z.boolean(),
})
export const detalleSchema = solicitudSchema.extend({
  antes: z.record(z.string(), z.unknown()), despues: z.record(z.string(), z.unknown()),
  eventos: z.array(z.object({ estadoAnterior: estadoSolicitudSchema.nullable(), estadoNuevo: estadoSolicitudSchema, responsable: responsableSchema.nullable(), comentario: z.string().nullable(), fechaEvento: z.string() })),
})
export const bandejaSchema = z.object({ items: z.array(solicitudSchema), total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive(), pendientesParaMi: z.number().int().nonnegative(), diasResaltar: z.number().int().positive() })
export const accesosSchema = z.object({ puedeVer: z.boolean(), puedeSolicitar: z.boolean(), pendientesParaMi: z.number().int().nonnegative(), diasResaltar: z.number().int().positive() })
export const resultadoSchema = z.object({ idSolicitud: z.number().int().positive(), estado: estadoSolicitudSchema })
export type BandejaNombre = 'pendientes' | 'mias' | 'resueltas'
export type Solicitud = z.infer<typeof solicitudSchema>
export type DetalleSolicitud = z.infer<typeof detalleSchema>
export type Accion = 'aprobar' | 'rechazar' | 'cancelar'
export const aceptadaSchema = z.object({ idSolicitud: z.number().int().positive().max(Number.MAX_SAFE_INTEGER), estado: z.literal('Pendiente'), requiereAprobacion: z.literal(true) })
export interface SolicitudEntrada { codigoTransaccion: string; tipoObjetivo: string; idObjetivo: string; idAgencia: string | null; contenido: Record<string, unknown> }
export const comentarioSchema = (accion: Accion) => z.object({ comentario: z.string().trim().max(300, 'El comentario admite hasta 300 caracteres.').refine((s) => accion !== 'rechazar' || s.length > 0, 'Escribe el motivo del rechazo.') })
