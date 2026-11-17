import { z } from 'zod'

/*
 * Contrato de la fecha contable (E4-05) en camelCase.
 *
 * - CON-01 GET /contabilidad/fechas-contables/actual → la fecha vigente según la hora de corte.
 * - CON-01 GET /contabilidad/fechas-contables/{fecha} (YYYY-MM-DD) → una fila del calendario.
 *
 * Los consulta cualquier usuario autenticado. Errores ProblemDetails: 400 FECHA_INVALIDA y
 * 404 (FECHA_NO_ENCONTRADA o CALENDARIO_SIN_FECHA) cuando la fecha no está en el calendario.
 * Generar el calendario y los períodos todavía no existe en el backend: aquí solo hay consulta.
 */

const BASE = '/api/v1/contabilidad/fechas-contables'

export const FECHA_CONTABLE_ENDPOINTS = {
  actual: `${BASE}/actual`,
  fecha: (fecha: string) => `${BASE}/${fecha}`,
} as const

/** Una fila de Contabilidad.FechaContable */
export const fechaContableSchema = z.object({
  idFechaContable: z.number(),
  /** Día calendario `YYYY-MM-DD`, sin hora ni zona */
  fecha: z.iso.date(),
  esDiaContable: z.boolean(),
  esFeriado: z.boolean(),
  esFinDeSemana: z.boolean(),
  /** Hora de corte `HH:mm:ss`: lo registrado después se fecha el siguiente día hábil */
  horaCorte: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
})

export type FechaContable = z.infer<typeof fechaContableSchema>
