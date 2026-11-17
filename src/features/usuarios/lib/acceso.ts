import { hasPermission, PERMISOS } from '@/shared/lib'

/** Roles que ven los usuarios (AUT-05, AUT-07); crear y cambiar exige usuarios:editar */
export const ROLES_GESTION_USUARIOS = ['ADMIN'] as const

/**
 * Solo decide qué se MUESTRA: el backend valida el permiso en cada endpoint (403 si no lo tiene).
 * AUT-05..09 exige ADMIN en backend.
 */
export function accesoUsuarios(roles: readonly string[], permisos: readonly string[] = []) {
  const lista = roles.map((rol) => rol.trim().toUpperCase())
  const consulta = lista.some((rol) => (ROLES_GESTION_USUARIOS as readonly string[]).includes(rol))
  return { consulta, creacion: hasPermission(permisos, PERMISOS.usuariosEditar) }
}
