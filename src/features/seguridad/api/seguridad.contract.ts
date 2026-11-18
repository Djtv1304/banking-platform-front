import { z } from 'zod'

/** SEG-01..08 (backend app/modules/seguridad): permisos de los roles en WorkOS y pestañas por rol. */
export const SEGURIDAD_ENDPOINTS = {
  permisos: '/api/v1/seguridad/permisos',
  permiso: (slug: string) => `/api/v1/seguridad/permisos/${encodeURIComponent(slug)}`,
  roles: '/api/v1/seguridad/roles',
  permisosRol: (rol: string) => `/api/v1/seguridad/roles/${encodeURIComponent(rol)}/permisos`,
  permisoRol: (rol: string, slug: string) =>
    `/api/v1/seguridad/roles/${encodeURIComponent(rol)}/permisos/${encodeURIComponent(slug)}`,
  pestanas: '/api/v1/seguridad/pestanas',
} as const

export const permisoSchema = z.object({
  slug: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  sistema: z.boolean(),
})
export type PermisoWorkOS = z.infer<typeof permisoSchema>

export const rolPermisosSchema = z.object({
  rol: z.string(),
  slug: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  permisos: z.array(z.string()),
})
export type RolPermisos = z.infer<typeof rolPermisosSchema>

export const pestanaRolesSchema = z.object({
  pestana: z.string().regex(/^\/[a-z0-9][a-z0-9/-]{0,78}$/),
  roles: z.array(z.string()),
})
export type PestanaRoles = z.infer<typeof pestanaRolesSchema>

/** Pestañas que no se personalizan (el backend también las rechaza): un ADMIN no se quita el acceso. */
export const PESTANAS_FIJAS: readonly string[] = ['/', '/seguridad/roles', '/seguridad/pestanas']
