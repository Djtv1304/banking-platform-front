import { z } from 'zod'

const detalleSchema = z.object({ v: z.literal(1), valorNuevo: z.union([z.string(), z.number(), z.boolean(), z.null()]), motivo: z.string() })

export function leerDetalleHistorial(observaciones: string) {
  try {
    const detalle = detalleSchema.safeParse(JSON.parse(observaciones))
    if (detalle.success) return { nuevo: detalle.data.valorNuevo, motivo: detalle.data.motivo, tieneDetalle: true }
  } catch {
    // El legado puede contener texto libre; se conserva sin inventar valores.
  }
  return { nuevo: null, motivo: observaciones, tieneDetalle: false }
}
