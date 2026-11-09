import { useQuery } from '@tanstack/react-query'

import { ApiError } from '@/shared/api'
import { buscarTarjetas, getTarjeta } from '@/features/tarjetas/api/tarjetas.api'

/*
 * Consultas de tarjetas (A-04). El estado cambia con cada aprobación o bloqueo, así que se piden de
 * nuevo al volver a la pantalla.
 */

/** Un 4xx (tarjeta inexistente, filtro inválido, sin permiso) no se arregla reintentando */
const reintentar = (fallos: number, error: Error) =>
  fallos < 1 && !(error instanceof ApiError && error.status !== null && error.status < 500)

/** TAR-02 */
export const useBuscarTarjetas = (params: Record<string, string>) =>
  useQuery({
    queryKey: ['tarjetas', 'buscar', params],
    queryFn: () => buscarTarjetas(params),
    retry: reintentar,
    staleTime: 0,
  })

/** TAR-03 · `null` cuando el id de la URL no es válido: no se llama a la API */
export const useTarjeta = (idTarjeta: number | null) =>
  useQuery({
    queryKey: ['tarjetas', 'detalle', idTarjeta],
    queryFn: () => getTarjeta(idTarjeta as number),
    enabled: idTarjeta !== null,
    retry: reintentar,
    staleTime: 0,
  })
