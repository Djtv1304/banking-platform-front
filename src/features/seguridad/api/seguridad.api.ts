import { z } from 'zod'

import { ApiError, apiClient } from '@/shared/api'
import {
  pestanaRolesSchema,
  permisoSchema,
  rolPermisosSchema,
  SEGURIDAD_ENDPOINTS,
  type PestanaRoles,
} from '@/features/seguridad/api/seguridad.contract'

/** Un 200 no garantiza JSON: si /api no llega al backend el hosting puede responder index.html */
function leer<T>(schema: z.ZodType<T>, data: unknown, status: number, mensaje: string): T {
  const result = schema.safeParse(data)
  if (!result.success) throw new ApiError(mensaje, status, 'respuesta_invalida')
  return result.data
}

const ROL_INVALIDO = 'No pudimos leer los permisos del rol. Inténtalo más tarde.'

/** SEG01 */
export async function listarPermisos(signal?: AbortSignal) {
  const { data, status } = await apiClient.get<unknown>(SEGURIDAD_ENDPOINTS.permisos, { signal })
  return leer(z.array(permisoSchema), data, status, 'No pudimos leer los permisos. Inténtalo más tarde.')
}

/** SEG03 */
export async function listarRolesPermisos(signal?: AbortSignal) {
  const { data, status } = await apiClient.get<unknown>(SEGURIDAD_ENDPOINTS.roles, { signal })
  return leer(z.array(rolPermisosSchema), data, status, 'No pudimos leer los roles. Inténtalo más tarde.')
}

/** SEG04 · Asignar un permiso a un rol */
export async function asignarPermiso(rol: string, permiso: string) {
  const { data, status } = await apiClient.post<unknown>(SEGURIDAD_ENDPOINTS.permisosRol(rol), { permiso })
  return leer(rolPermisosSchema, data, status, ROL_INVALIDO)
}

/** SEG05 · Quitar un permiso de un rol */
export async function quitarPermiso(rol: string, permiso: string) {
  const { data, status } = await apiClient.delete<unknown>(SEGURIDAD_ENDPOINTS.permisoRol(rol, permiso))
  return leer(rolPermisosSchema, data, status, ROL_INVALIDO)
}

/** SEG07 · Pestañas personalizadas; las que no vienen usan el menú por defecto */
export async function listarPestanas(signal?: AbortSignal) {
  const { data, status } = await apiClient.get<unknown>(SEGURIDAD_ENDPOINTS.pestanas, { signal })
  return leer(z.array(pestanaRolesSchema), data, status, 'No pudimos leer la configuración del menú.')
}

/** SEG08 · Reemplaza toda la configuración (lista vacía = menú por defecto) */
export async function guardarPestanas(pestanas: PestanaRoles[]) {
  const { data, status } = await apiClient.put<unknown>(SEGURIDAD_ENDPOINTS.pestanas, { pestanas })
  return leer(z.array(pestanaRolesSchema), data, status, 'No pudimos guardar la configuración del menú.')
}
