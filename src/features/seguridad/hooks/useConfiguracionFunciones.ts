import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { publicarEventoSesion, refreshSession, useAuthStore } from '@/features/auth'
import { consultarFunciones, guardarFunciones } from '@/features/seguridad/api/funciones.api'

export const configuracionFuncionesKey = (actor: string | undefined) => ['seguridad', 'funciones', actor] as const
export function useConfiguracionFunciones(habilitado: boolean) {
  const actor = useAuthStore((s) => s.user?.idUsuario)
  return useQuery({ queryKey: configuracionFuncionesKey(actor), queryFn: ({ signal }) => consultarFunciones(signal),
    enabled: habilitado, retry: false, staleTime: Infinity, refetchOnWindowFocus: false })
}
export function useGuardarFunciones() {
  const cache = useQueryClient()
  const actor = useAuthStore((s) => s.user?.idUsuario)
  return useMutation({ mutationFn: guardarFunciones, retry: false, onSuccess: async (config) => {
    await refreshSession()
    if (useAuthStore.getState().user?.idUsuario !== actor) return
    cache.setQueryData(configuracionFuncionesKey(actor), config)
    publicarEventoSesion({ tipo: 'accesos-cambiados' })
  } })
}
