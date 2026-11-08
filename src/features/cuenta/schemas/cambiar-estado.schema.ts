import { z } from 'zod'

/**
 * Formulario del modal de cambio de estado. Si se pasa `confirmacion` (últimos 4 dígitos de la
 * cuenta), el asesor debe escribirlos para confirmar una acción irreversible como el cierre.
 */
export const crearCambioEstadoSchema = (confirmacion: string | null) =>
  z
    .object({
      motivo: z.string().min(1, 'Selecciona el motivo'),
      observacion: z.string().trim().max(250, 'La observación no puede superar 250 caracteres'),
      confirmacion: z.string().trim(),
    })
    .refine((datos) => !confirmacion || datos.confirmacion === confirmacion, {
      path: ['confirmacion'],
      message: 'Los dígitos no coinciden con la cuenta',
    })
    .transform(({ motivo, observacion }) => ({ motivo, observacion: observacion || null }))

export type CambioEstadoInput = z.input<ReturnType<typeof crearCambioEstadoSchema>>
export type CambioEstadoData = z.output<ReturnType<typeof crearCambioEstadoSchema>>
