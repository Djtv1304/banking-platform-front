import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ApiError } from '@/shared/api'
import {
  asignarPermiso,
  borrarPermiso,
  crearPermiso,
  guardarPestanas,
  listarPermisos,
  listarPestanas,
  listarRolesPermisos,
  quitarPermiso,
} from '@/features/seguridad/api/seguridad.api'
import type { PestanaRoles, RolPermisos } from '@/features/seguridad/api/seguridad.contract'

const SEGURIDAD_KEY = ['seguridad'] as const
const PERMISOS_KEY = [...SEGURIDAD_KEY, 'permisos'] as const
const ROLES_KEY = [...SEGURIDAD_KEY, 'roles'] as const
export const PESTANAS_KEY = [...SEGURIDAD_KEY, 'pestanas'] as const

/** Un 4xx (sin permiso, inexistente) no se arregla reintentando */
const reintentar = (fallos: number, error: Error) =>
  fallos < 1 && !(error instanceof ApiError && error.status !== null && error.status < 500)

export const usePermisosWorkOS = (habilitado: boolean) =>
  useQuery({ queryKey: PERMISOS_KEY, queryFn: ({ signal }) => listarPermisos(signal), enabled: habilitado, retry: reintentar })

export const useRolesPermisos = (habilitado: boolean) =>
  useQuery({ queryKey: ROLES_KEY, queryFn: ({ signal }) => listarRolesPermisos(signal), enabled: habilitado, retry: reintentar })

/** SEG09 · Al crear, el catálogo se vuelve a pedir */
export function useCrearPermiso() {
  const cache = useQueryClient()
  return useMutation({ mutationFn: crearPermiso, retry: false, onSuccess: () => cache.invalidateQueries({ queryKey: PERMISOS_KEY }) })
}

/** SEG10 · Al borrar cambian el catálogo y los roles que lo tenían */
export function useBorrarPermiso() {
  const cache = useQueryClient()
  return useMutation({
    mutationFn: borrarPermiso,
    retry: false,
    onSuccess: () => Promise.all([cache.invalidateQueries({ queryKey: PERMISOS_KEY }), cache.invalidateQueries({ queryKey: ROLES_KEY })]),
  })
}

/** Asigna o quita un permiso; la respuesta (el rol actualizado) reemplaza al rol en la caché */
export function useCambiarPermisoRol() {
  const cache = useQueryClient()
  return useMutation({
    mutationFn: ({ rol, permiso, asignar }: { rol: string; permiso: string; asignar: boolean }) =>
      asignar ? asignarPermiso(rol, permiso) : quitarPermiso(rol, permiso),
    retry: false,
    onSuccess: (actualizado) =>
      cache.setQueryData<RolPermisos[]>(ROLES_KEY, (roles) => roles?.map((r) => (r.rol === actualizado.rol ? actualizado : r))),
  })
}

/**
 * Configuración del menú. Si falla (p. ej. la tabla aún no existe) el menú usa el valor por defecto:
 * esta configuración solo cambia lo que se muestra, no la autorización de las APIs.
 */
export const usePestanas = (habilitado: boolean) =>
  useQuery({
    queryKey: PESTANAS_KEY,
    queryFn: ({ signal }) => listarPestanas(signal),
    enabled: habilitado,
    retry: false,
    staleTime: 5 * 60_000,
  })

export function useGuardarPestanas() {
  const cache = useQueryClient()
  return useMutation({
    mutationFn: (pestanas: PestanaRoles[]) => guardarPestanas(pestanas),
    retry: false,
    onSuccess: (guardadas) => cache.setQueryData(PESTANAS_KEY, guardadas),
  })
}
