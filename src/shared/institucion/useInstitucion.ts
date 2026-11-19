import { useQuery } from '@tanstack/react-query'
import { INSTITUCION_KEY, NOMBRE_PENDIENTE, obtenerInstitucion } from '@/shared/institucion/institucion.api'

/** Caché común para login y encabezado; un fallo no borra la última respuesta válida. */
export function useInstitucion() {
  const consulta = useQuery({
    queryKey: INSTITUCION_KEY,
    queryFn: ({ signal }) => obtenerInstitucion(signal),
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })

  return {
    ...consulta,
    nombre: consulta.data?.nombre ?? NOMBRE_PENDIENTE,
    sitioWeb: consulta.data?.sitioWeb ?? null,
  }
}
