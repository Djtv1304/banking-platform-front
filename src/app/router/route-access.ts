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
  // CTA-02/03/04: ASESOR, CAJERO, SUPERVISOR y ADMIN
  consultarCuentas: ['staff'],
  // CTA-07: ASESOR, SUPERVISOR y ADMIN (editar e historial se deciden por rol dentro de la página)
  consultarCupos: ['staff'],
  // CLI-03/04: ASESOR, CAJERO, SUPERVISOR y ADMIN
  consultarClientes: ['staff'],
  // CTA-06: ASESOR, CAJERO, SUPERVISOR y ADMIN
  consultarMovimientos: ['staff'],
  // TAR-02/03: ASESOR, SUPERVISOR y ADMIN (el CAJERO es 'staff' en la UI: su 403 muestra «No tienes permiso»)
  consultarTarjetas: ['staff'],
  // F-05: módulos del menú todavía en preparación (parámetros y accesos son de administración)
  creditos: ['staff'],
  parametrosGenerales: ['admin'],
  cuentasContables: ['staff'],
  accesosRoles: ['admin'],
} as const satisfies Record<string, readonly AccessProfile[]>
