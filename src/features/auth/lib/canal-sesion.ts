import type { MotivoCierre } from '@/features/auth/api/auth.contract'

/**
 * Mensajes entre pestañas de la SPA (mismo origen). Así todas van al login a la vez, comparten
 * la última renovación de la sesión y se enteran de un login hecho en otra pestaña.
 */
export type MensajeSesion =
  /** La sesión terminó (401, cierre por inactividad o "Cerrar sesión") */
  | { tipo: 'cerrada'; motivo: MotivoCierre | null }
  /** Una pestaña renovó la sesión en `en` (ms) */
  | { tipo: 'renovada'; en: number }
  /** Una pestaña nueva pregunta cuándo fue la última renovación */
  | { tipo: 'consulta' }
  /** Una pestaña restauró la sesión: las que están en /login pueden entrar sin volver a WorkOS */
  | { tipo: 'iniciada' }
  | { tipo: 'agencia-cambiada' }

const NOMBRE_CANAL = 'enquocoop-sesion'

let canal: BroadcastChannel | null | undefined

function obtenerCanal() {
  if (canal === undefined) {
    canal = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(NOMBRE_CANAL)
  }
  return canal
}

export function publicar(mensaje: MensajeSesion) {
  try {
    obtenerCanal()?.postMessage(mensaje)
  } catch {
    // Sin canal (navegador antiguo o canal cerrado): cada pestaña se entera en su próxima petición
  }
}

export function escuchar(alRecibir: (mensaje: MensajeSesion) => void): () => void {
  const actual = obtenerCanal()
  if (!actual) return () => {}
  const manejar = (event: MessageEvent<MensajeSesion>) => alRecibir(event.data)
  actual.addEventListener('message', manejar)
  return () => actual.removeEventListener('message', manejar)
}
