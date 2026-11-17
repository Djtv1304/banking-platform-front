import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ApiError } from '@/shared/api'
import { useAuthStore, usePermisos } from '@/features/auth'
import { actualizarCupo, getCupos, getHistorialCupo } from '@/features/cuenta/api/cupos.api'
import type { CupoUpdate } from '@/features/cuenta/api/cupos.contract'
import { permisosCupos } from '@/features/cuenta/lib/cupos'

/* Cupos por canal (A-06). El consumo cambia con cada operación: no se guardan por sesión */

/** Un 4xx (cuenta o canal inexistente, sin permiso) no se arregla reintentando */
const reintentar = (fallos: number, error: Error) =>
  fallos < 1 && !(error instanceof ApiError && error.status !== null && error.status < 500)

const claveCupos = (idCuenta: number | null) => ['cuentas', 'cupos', idCuenta] as const

/** CTA-07 · `null` cuando el id de la URL no es válido: no se llama a la API */
export const useCupos = (idCuenta: number | null) =>
  useQuery({
    queryKey: claveCupos(idCuenta),
    queryFn: () => getCupos(idCuenta as number),
    enabled: idCuenta !== null,
    retry: reintentar,
    staleTime: 0,
  })

/** CTA-09 · `idCanal` null mientras no se abre el historial de un canal */
export const useHistorialCupo = (idCuenta: number, idCanal: number | null, page: number) =>
  useQuery({
    queryKey: [...claveCupos(idCuenta), 'historial', idCanal, page],
    queryFn: () => getHistorialCupo(idCuenta, idCanal as number, page),
    enabled: idCanal !== null,
    retry: reintentar,
    placeholderData: keepPreviousData,
  })

/** CTA-08 · Sin reintento; al guardar se vuelven a pedir los cupos y su historial */
export function useActualizarCupo(idCuenta: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ idCanal, body }: { idCanal: number; body: CupoUpdate }) => actualizarCupo(idCuenta, idCanal, body),
    retry: false,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: claveCupos(idCuenta) }),
  })
}

/** Acciones visibles según los roles reales de /auth/me */
export function usePermisosCupos() {
  // Se elige el arreglo (referencia estable) y no un objeto nuevo en cada render
  const roles = useAuthStore((state) => state.user?.roles)
  return permisosCupos(roles ?? [], usePermisos())
}
