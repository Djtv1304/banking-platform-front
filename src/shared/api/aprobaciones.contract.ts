import { z } from 'zod'

/** Confirmación de que una operación sensible ingresó a la cola E0-08. */
export const aceptadaSchema = z.object({
  idSolicitud: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  estado: z.literal('Pendiente'),
  requiereAprobacion: z.literal(true),
})
