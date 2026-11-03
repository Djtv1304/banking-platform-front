import type { AccessProfile } from '@/features/auth'

/**
 * Perfiles que pueden entrar a cada ruta privada. Lo usan el router (RequireProfile) y el sidebar,
 * para que una opción oculta tampoco sea accesible escribiendo la URL.
 * Sin entrada = todos los usuarios autenticados. El admin siempre tiene acceso.
 */
export const ROUTE_ACCESS = {
  register: ['staff'],
} as const satisfies Record<string, readonly AccessProfile[]>
