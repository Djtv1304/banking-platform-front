import type { AccessProfile } from '@/features/auth'

/**
 * Perfiles que pueden entrar a cada ruta privada. Lo usan el router (RequireProfile) y el sidebar,
 * para que una opción oculta tampoco sea accesible escribiendo la URL.
 * Sin entrada = todos los usuarios autenticados. El admin siempre tiene acceso.
 */
export const ROUTE_ACCESS = {
  registrarCliente: ['staff'],
  // TAR-01: ASESOR y ADMIN
  solicitarTarjeta: ['staff'],
  // CLI-03/04: ASESOR, CAJERO, SUPERVISOR y ADMIN
  consultarClientes: ['staff'],
} as const satisfies Record<string, readonly AccessProfile[]>
