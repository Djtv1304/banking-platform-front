/** Roles que gestionan usuarios (AUT-05 a AUT-09) */
export const ROLES_GESTION_USUARIOS = ['ADMIN'] as const

/**
 * Solo decide qué se MUESTRA: el backend valida el permiso en cada endpoint (403 si no lo tiene).
 * AUT-05..09 exige ADMIN en backend.
 */
export function accesoUsuarios(roles: readonly string[]) {
  const lista = roles.map((rol) => rol.trim().toUpperCase())
  const gestiona = lista.some((rol) => (ROLES_GESTION_USUARIOS as readonly string[]).includes(rol))
  return { consulta: gestiona, creacion: gestiona }
}
