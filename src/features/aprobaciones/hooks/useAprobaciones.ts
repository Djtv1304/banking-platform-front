import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuthStore } from '@/features/auth'
import { obtenerAccesos, obtenerBandeja, obtenerSolicitud, resolverSolicitud } from '@/features/aprobaciones/api/aprobaciones.api'
import type { Accion, BandejaNombre } from '@/features/aprobaciones/api/aprobaciones.contract'

export function useClaveAprobaciones() {
  const user = useAuthStore((s) => s.user)
  return ['aprobaciones', user?.idUsuario ?? '', user?.idAgencia ?? 'global'] as const
}

export function useAccesosAprobaciones() {
  const key = useClaveAprobaciones()
  const authenticated = useAuthStore((s) => s.status === 'authenticated')
  return useQuery({ queryKey: [...key, 'accesos'], queryFn: obtenerAccesos, enabled: authenticated, retry: false, staleTime: 30_000, refetchOnWindowFocus: false })
}

export function useBandejaAprobaciones(bandeja: BandejaNombre, page: number) {
  const key = useClaveAprobaciones()
  return useQuery({ queryKey: [...key, 'bandeja', bandeja, page], queryFn: () => obtenerBandeja(bandeja, page), retry: false, refetchOnWindowFocus: false })
}

export function useDetalleAprobacion(id: number) {
  const key = useClaveAprobaciones()
  return useQuery({ queryKey: [...key, 'detalle', id], queryFn: () => obtenerSolicitud(id), enabled: Number.isSafeInteger(id) && id > 0, retry: false, refetchOnWindowFocus: false })
}

export function useResolverAprobacion(id: number) {
  const client = useQueryClient()
  return useMutation({ mutationFn: (datos: { accion: Accion; comentario: string }) => resolverSolicitud(id, datos.accion, datos.comentario), onSettled: async (resultado, error, { accion }) => {
    // Tambien un 409 o una caida despues del commit exige releer el estado real.
    await client.invalidateQueries({ queryKey: ['aprobaciones'] })
    if (resultado?.estado === 'Ejecutada' || (error && accion === 'aprobar')) {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['organizacion', 'agencias'] }),
        client.invalidateQueries({ queryKey: ['catalogos', 'agencias'] }),
      ])
    }
  } })
}
