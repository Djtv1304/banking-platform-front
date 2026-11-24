import { aceptadaSchema } from '@/shared/api/aprobaciones.contract'
import { z } from 'zod'

export const PARAMETROS_ROLES = ['ADMIN', 'SUPERVISOR', 'ASESOR', 'AUDITOR'] as const
export const valorSchema = z.object({
  idParametroValor: z.number().int().positive(), idAgencia: z.string().nullable(), valor: z.string(),
  vigenciaDesde: z.iso.date(), vigenciaHasta: z.iso.date().nullable(), estado: z.enum(['A', 'C']),
  creadoPor: z.string().nullable(), responsable: z.string(), fechaCreacion: z.string(),
})
export const parametroSchema = z.object({
  clave: z.string(), modulo: z.string(), descripcion: z.string(),
  tipoDato: z.enum(['Entero', 'Decimal', 'Texto', 'Booleano', 'Hora', 'Lista']), unidad: z.string().nullable(),
  minimo: z.string().nullable(), maximo: z.string().nullable(), puedeEditar: z.boolean(), valoresPermitidos: z.array(z.unknown()).nullable(), esSensible: z.boolean(), admiteAgencia: z.boolean(), estado: z.enum(['A', 'I']),
  valorActual: valorSchema.nullable(), proximoValor: valorSchema.nullable(), valoresProgramados: z.array(valorSchema), historial: z.array(valorSchema),
  agenciaConsultada: z.string().nullable(), fechaConsulta: z.iso.date(),
})
export const listaSchema = z.object({ items: z.array(parametroSchema), total: z.number().int(), page: z.number().int(), pageSize: z.number().int(), modulos: z.array(z.string()) })
export const pendienteSchema = aceptadaSchema
export const registradoSchema = z.object({ idParametroValor: z.number().int().positive(), estado: z.literal('Registrado') })
export const entradaSchema = z.object({ valor: z.string().max(500), vigenciaDesde: z.iso.date(), idAgencia: z.string().regex(/^\d{3}$/).nullable() }).strict()
export type Parametro = z.infer<typeof parametroSchema>
export type ValorParametro = z.infer<typeof valorSchema>
export type EntradaValor = z.infer<typeof entradaSchema>
