import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { editarEntidad, ENTIDAD_KEY, obtenerEntidad, type Entidad } from '@/features/organizacion/api/entidad'

/** Conserva la cancelación y evita refrescar la ficha mientras se edita su borrador. */
export function useEntidad(permitido: boolean, editando: boolean) {
  return useQuery({
    queryKey: ENTIDAD_KEY,
    queryFn: ({ signal }) => obtenerEntidad(signal),
    enabled: permitido,
    retry: false,
    refetchOnWindowFocus: !editando,
  })
}

/** Una consulta anterior no debe sobrescribir la respuesta persistida del PATCH. */
export async function confirmarEntidadEnCache(cache: QueryClient, entidad: Entidad) {
  await cache.cancelQueries({ queryKey: ENTIDAD_KEY })
  cache.setQueryData(ENTIDAD_KEY, entidad)
}

export function useActualizarEntidad() {
  const cache = useQueryClient()
  return useMutation({
    mutationFn: editarEntidad,
    retry: false,
    onSuccess: (entidad) => confirmarEntidadEnCache(cache, entidad),
  })
}
