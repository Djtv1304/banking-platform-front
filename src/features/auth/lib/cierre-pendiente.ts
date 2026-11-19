import type { MotivoCierre } from '@/features/auth/api/auth.contract'
import { esMotivoCierre } from '@/features/auth/api/auth.contract'
import { sanitizeReturnTo, soloRuta } from '@/features/auth/lib/return-to'

/*
 * Aviso y ruta de vuelta que deben sobrevivir al viaje por el logout de WorkOS (navegación completa
 * que vuelve a /login sin parámetros). Solo en esta pestaña y solo hasta que /login lo lea. Guarda la ruta sin query ni hash (E0-07).
 */

const CLAVE = 'enquocoop-cierre-pendiente'

export interface CierrePendiente {
  motivo: MotivoCierre
  returnTo?: string
}

export function guardarCierrePendiente(cierre: CierrePendiente) {
  try {
    // Sólo la ruta: los filtros de la URL no se guardan en el navegador
    const returnTo = cierre.returnTo === undefined ? undefined : sanitizeReturnTo(soloRuta(cierre.returnTo))
    sessionStorage.setItem(CLAVE, JSON.stringify({ motivo: cierre.motivo, returnTo }))
  } catch {
    // Sin almacenamiento (modo privado estricto): /login se muestra sin aviso
  }
}

export function leerCierrePendiente(): CierrePendiente | null {
  try {
    const crudo: unknown = JSON.parse(sessionStorage.getItem(CLAVE) ?? 'null')
    if (typeof crudo !== 'object' || crudo === null) return null
    const { motivo, returnTo } = crudo as Record<string, unknown>
    if (!esMotivoCierre(motivo)) return null
    return { motivo, returnTo: typeof returnTo === 'string' ? sanitizeReturnTo(returnTo) : undefined }
  } catch {
    return null
  }
}

export function borrarCierrePendiente() {
  try {
    sessionStorage.removeItem(CLAVE)
  } catch {
    // Nada que borrar
  }
}
