/*
 * Perfiles de acceso de la UI, derivados de los roles que devuelve GET /api/v1/auth/me.
 *
 * - admin:   ve todas las opciones del sidebar y todas las rutas.
 * - cliente: cliente de la cooperativa que usa la banca virtual.
 * - staff:   cualquier otro rol (personal del banco: cajero, asesor, jefe de agencia…).
 *
 * ⚠️ Esto solo decide qué se MUESTRA. Cada endpoint del backend debe validar sus propios permisos.
 * ⚠️ Confirmar con el backend/WorkOS los slugs exactos de los roles y ajustarlos aquí.
 */
export const ROLES = {
  admin: 'admin',
  cliente: 'cliente',
} as const

export type AccessProfile = 'admin' | 'staff' | 'cliente'

/**
 * Si el usuario tiene varios roles gana el de mayor alcance: admin > staff > cliente.
 * Sin roles se trata como cliente (el perfil con menos opciones).
 */
export function getAccessProfile(roles: readonly string[]): AccessProfile {
  const normalized = roles.map((role) => role.trim().toLowerCase())
  if (normalized.includes(ROLES.admin)) return 'admin'
  if (normalized.some((role) => role !== ROLES.cliente)) return 'staff'
  return 'cliente'
}

/** `allowed` vacío o ausente = visible para todos. El admin siempre tiene acceso. */
export function canAccess(profile: AccessProfile, allowed?: readonly AccessProfile[]) {
  return !allowed?.length || profile === 'admin' || allowed.includes(profile)
}
