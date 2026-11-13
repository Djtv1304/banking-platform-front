/** Roles que gestionan usuarios (AUT-05 a AUT-09) */
export const ROLES_GESTION_USUARIOS = ['ADMIN', 'SUPERVISOR'] as const

/**
 * Solo decide qué se MUESTRA: el backend valida el permiso en cada endpoint (403 si no lo tiene).
 * Por ahora ambos roles pueden consultar y crear.
 */
export function accesoUsuarios(roles: readonly string[]) {
  const lista = roles.map((rol) => rol.trim().toUpperCase())
  const gestiona = lista.some((rol) => (ROLES_GESTION_USUARIOS as readonly string[]).includes(rol))
  return { consulta: gestiona, creacion: gestiona }
}
