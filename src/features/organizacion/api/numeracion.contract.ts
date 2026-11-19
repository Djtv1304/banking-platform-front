import { z } from 'zod'

export const reglaNumeracionSchema = z.object({
  prefijo: z.string().regex(/^[0-9]{1,6}$/, 'Ingrese entre 1 y 6 digitos para el prefijo.'),
  incluyeAgencia: z.boolean(),
  longitudSecuencia: z.number().int().min(6, 'La secuencia requiere al menos 6 digitos.').max(10, 'La secuencia admite hasta 10 digitos.'),
  algoritmoVerificador: z.enum(['NINGUNO', 'MODULO_10', 'MODULO_11']),
}).strict()
const reglaGuardadaSchema = reglaNumeracionSchema.extend({ responsable: z.string(), idReglaNumeracion: z.number().int().positive(), usada: z.boolean(), vigenciaDesde: z.iso.date(), vigenciaHasta: z.iso.date().nullable(), fechaCreacion: z.string(), idSolicitud: z.number().nullable(), estado: z.enum(['A', 'I']) })
export const ejemploNumeracionSchema = z.object({ ejemplo: z.string().nullable(), estadoSecuencia: z.enum(['DISPONIBLE', 'AGOTADA', 'SIN_REGLA', 'SIN_AGENCIA']), agenciaEjemplo: z.string().nullable() })
export const numeracionSchema = ejemploNumeracionSchema.extend({ regla: reglaGuardadaSchema.nullable(), usada: z.boolean(), historial: z.array(reglaGuardadaSchema), solicitudPendiente: z.number().nullable() })
export type ReglaNumeracion = z.infer<typeof reglaNumeracionSchema>
export type Numeracion = z.infer<typeof numeracionSchema>
export const ALGORITMOS: Record<ReglaNumeracion['algoritmoVerificador'], string> = { NINGUNO: 'Sin digito verificador', MODULO_10: 'Modulo 10', MODULO_11: 'Modulo 11' }
