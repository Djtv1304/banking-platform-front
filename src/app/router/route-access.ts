import type { AccessProfile } from '@/features/auth'

/**
 * Perfiles que pueden entrar a cada ruta privada. Lo usan el router (RequireProfile) y el sidebar,
 * para que una opción oculta tampoco sea accesible escribiendo la URL.
 * Sin entrada = todos los usuarios autenticados. El admin siempre tiene acceso.
 */
export const ROUTE_ACCESS = {
  // El rol exacto (ASESOR o ADMIN) se comprueba también dentro de la página.
  datosCooperativa: ['staff'],
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
  // AUT-05 a AUT-09: ADMIN y SUPERVISOR (el rol exacto se comprueba en el menú y dentro de la página)
  gestionUsuarios: ['staff'],
  // F-05: módulos del menú todavía en preparación (parámetros son de administración)
  creditos: ['staff'],
  // E2-02 / CON-03: CONTADOR, AUDITOR y ADMIN (el rol exacto se comprueba en el menú y en el router)
  cuentasContables: ['staff'],
  // ORG-01/02: solo ADMIN
  agencias: ['admin'],
  // CTA-01: ASESOR y ADMIN
  abrirCuenta: ['staff'],
} as const satisfies Record<string, readonly AccessProfile[]>
