import type { MeResponse } from '@/features/auth/api/auth.contract'

// Coincide con el catálogo del backend. Primero las rutas más específicas.
const SECCIONES = [
  '/parametros',
  '/organizacion/entidad', '/organizacion/agencias', '/productos', '/catalogos',
  '/registrar-cliente', '/clientes-busqueda', '/cuentas/abrir', '/cuentas',
  '/solicitar-tarjeta', '/tarjetas', '/contabilidad/asientos',
  '/contabilidad/fecha-contable', '/contabilidad', '/usuarios',
  '/seguridad/roles', '/seguridad/pestanas', '/creditos',
] as const

/** Restricción adicional; no reemplaza los guards de rol, operación o agencia. */
export function permiteSeccion(ruta: string, accesos: MeResponse['accesosSecciones']): boolean {
  if (!accesos) return true
  const pathname = ruta.split(/[?#]/)[0]
  const seccion = SECCIONES.find((p) => pathname === p || pathname.startsWith(p + '/'))
  return !seccion || accesos.habilitadas.includes(seccion)
}
