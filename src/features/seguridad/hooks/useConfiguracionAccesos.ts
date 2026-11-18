import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { consultarConfiguracion, guardarConfiguracion } from '@/features/seguridad/api/accesos.api'
import { refreshSession, publicarEventoSesion } from '@/features/auth'

const KEY = ['seguridad', 'configuracion-accesos'] as const

export function useConfiguracionAccesos(habilitado: boolean) {
  return useQuery({ queryKey: KEY, queryFn: ({ signal }) => consultarConfiguracion(signal), enabled: habilitado, retry: false, staleTime: Infinity, refetchOnWindowFocus: false })
}

export function useGuardarConfiguracionAccesos() {
  const cache = useQueryClient()
  return useMutation({
    mutationFn: guardarConfiguracion,
    retry: false,
    onSuccess: async (actual) => {
      await refreshSession()
      publicarEventoSesion({ tipo: 'accesos-cambiados' })
      await cache.cancelQueries({ queryKey: KEY })
      cache.setQueryData(KEY, actual)
      // Conserva los consumidores del contrato de pestañas integrado por el equipo.
      cache.setQueryData(['seguridad', 'pestanas'], actual.pestanas)
    },
  })
}
