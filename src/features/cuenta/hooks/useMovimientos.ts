import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { ApiError } from '@/shared/api'
import { getMovimientos } from '@/features/cuenta/api/movimientos.api'

/** Un 4xx (cuenta inexistente, rango inválido, sin permiso) no se arregla reintentando */
const reintentar = (fallos: number, error: Error) =>
  fallos < 1 && !(error instanceof ApiError && error.status !== null && error.status < 500)

/** CTA-06 · `null` cuando el id de la URL no es válido: no se llama a la API */
export const useMovimientos = (idCuenta: number | null, params: Record<string, string>) =>
  useQuery({
    queryKey: ['cuentas', 'movimientos', idCuenta, params],
    queryFn: () => getMovimientos(idCuenta as number, params),
    enabled: idCuenta !== null,
    retry: reintentar,
    // Los movimientos cambian con cada operación: no se reutilizan entre visitas
    staleTime: 0,
    // Al cambiar de página se sigue mostrando la anterior hasta que llegue la nueva
    placeholderData: keepPreviousData,
  })
