import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ApiError } from '@/shared/api'
import { useAuthStore } from '@/features/auth'
import { actualizarEntidad, getEntidad } from '@/features/organizacion/api/entidad.api'
import type { EntidadUpdate } from '@/features/organizacion/api/entidad.contract'
import { puedeEditarEntidad } from '@/features/organizacion/lib/entidad-texto'

/** Un 4xx (sin registro, sin permiso) no se arregla reintentando */
const reintentar = (fallos: number, error: Error) =>
  fallos < 1 && !(error instanceof ApiError && error.status !== null && error.status < 500)

export const claveEntidad = ['organizacion', 'entidad'] as const

/** GET de la entidad (ASESOR y ADMIN) */
export const useEntidad = () =>
  useQuery({
    queryKey: claveEntidad,
    queryFn: getEntidad,
    retry: reintentar,
  })

/** PATCH · Sin reintento; la respuesta trae la entidad completa y reemplaza lo que había en la consulta */
export function useActualizarEntidad() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: EntidadUpdate) => actualizarEntidad(body),
    retry: false,
    onSuccess: (entidad) => queryClient.setQueryData(claveEntidad, entidad),
  })
}

/** El botón «Editar» solo se muestra con los roles reales de /auth/me que el PATCH permite */
export function usePuedeEditarEntidad() {
  // Se elige el arreglo (referencia estable) y no un valor nuevo en cada render
  const roles = useAuthStore((state) => state.user?.roles)
  return puedeEditarEntidad(roles ?? [])
}
