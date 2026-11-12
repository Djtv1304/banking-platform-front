import type { EstadoAgencia } from '@/features/organizacion/api/agencias.contract'

/* Reglas de pantalla de la administración de agencias, sin UI para probarlas aparte */

export const ETIQUETA_ESTADO: Record<EstadoAgencia, string> = { A: 'Activa', I: 'Inactiva', C: 'Cerrada' }

export type AccionEstado = 'desactivar' | 'activar'

/** Solo A ↔ I: una agencia cerrada (`C`) no tiene acciones porque la API no sale de ese estado */
export function accionEstado(estado: EstadoAgencia): AccionEstado | null {
  if (estado === 'A') return 'desactivar'
  if (estado === 'I') return 'activar'
  return null
}
