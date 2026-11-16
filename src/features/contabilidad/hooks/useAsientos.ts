import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { ApiError } from '@/shared/api'
import { getAsiento, getAsientos } from '@/features/contabilidad/api/asientos.api'

/** Un 4xx (filtro inválido, sin permiso, endpoint sin desplegar) no se arregla reintentando */
const reintentar = (fallos: number, error: Error) =>
  fallos < 1 && !(error instanceof ApiError && error.status !== null && error.status < 500)

/** CON-04 · Al cambiar de página se sigue mostrando la anterior hasta que llegue la nueva */
export const useAsientos = (params: Record<string, string>) =>
  useQuery({
    queryKey: ['contabilidad', 'asientos', 'lista', params],
    queryFn: () => getAsientos(params),
    retry: reintentar,
    placeholderData: keepPreviousData,
  })

/** CON-05 · `null` = ningún asiento abierto: no se llama a la API */
export const useAsiento = (idAsiento: number | null) =>
  useQuery({
    queryKey: ['contabilidad', 'asientos', 'detalle', idAsiento],
    queryFn: () => getAsiento(idAsiento as number),
    enabled: idAsiento !== null,
    retry: reintentar,
  })
