import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { actualizarAgencia, crearAgencia, obtenerAgencia } from '@/features/organizacion/api/agencias.api'
import type { AgenciaUpdate } from '@/features/organizacion/api/agencias.contract'

/** Lista que muestra la página (y el resto de la app): el catálogo CAT-06 */
const CLAVE_AGENCIAS = ['catalogos', 'agencias'] as const
const CLAVE_DETALLE = ['organizacion', 'agencia'] as const

/** Detalle para precargar la edición. Siempre fresco: es la base para saber qué cambió */
export function useAgenciaDetalle(idAgencia: string | null) {
  return useQuery({
    queryKey: [...CLAVE_DETALLE, idAgencia],
    queryFn: () => obtenerAgencia(idAgencia ?? ''),
    enabled: idAgencia !== null,
    staleTime: 0,
    gcTime: 0,
  })
}

/** ORG-01 · Sin reintento; al crear se vuelve a pedir el catálogo de agencias */
export function useCrearAgencia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: crearAgencia,
    retry: false,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE_AGENCIAS }),
  })
}

/** ORG-02 · Edición parcial o cambio de estado; sin reintento */
export function useActualizarAgencia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ idAgencia, body }: { idAgencia: string; body: AgenciaUpdate }) => actualizarAgencia(idAgencia, body),
    retry: false,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: CLAVE_AGENCIAS }),
        queryClient.invalidateQueries({ queryKey: CLAVE_DETALLE }),
      ]),
  })
}
