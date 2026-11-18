import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ApiError } from '@/shared/api'
import {
  aprobarArqueo,
  listarBovedas,
  listarMovimientosBoveda,
  obtenerBoveda,
  operacionSinConfirmar,
  registrarArqueo,
  registrarMovimiento,
} from '@/features/boveda/api/bovedas.api'
import type { RegistrarArqueo, RegistrarMovimiento } from '@/features/boveda/api/bovedas.contract'

export const BOVEDAS_KEY = ['bovedas'] as const

/** Un 4xx (sin permiso, inexistente, filtro inválido, límite de solicitudes) no se arregla reintentando */
const reintentar = (fallos: number, error: Error) =>
  fallos < 1 && !(error instanceof ApiError && error.status !== null && error.status < 500)

/* El efectivo cambia con cada operación de caja o ATM: los saldos no se reutilizan entre visitas */
const SIEMPRE_FRESCO = { staleTime: 0, retry: reintentar } as const

/** BOV-01 · Al cambiar un filtro se siguen viendo las bóvedas anteriores hasta que llegan las nuevas */
export const useBovedas = (params: Record<string, string>, habilitado: boolean) =>
  useQuery({
    ...SIEMPRE_FRESCO,
    queryKey: [...BOVEDAS_KEY, 'lista', params],
    queryFn: ({ signal }) => listarBovedas(params, signal),
    enabled: habilitado,
    placeholderData: keepPreviousData,
  })

/** BOV-02 · `null` cuando el id de la URL no es válido: no se llama a la API */
export const useBoveda = (idBoveda: number | null, habilitado: boolean) =>
  useQuery({
    ...SIEMPRE_FRESCO,
    queryKey: [...BOVEDAS_KEY, 'detalle', idBoveda],
    queryFn: ({ signal }) => obtenerBoveda(idBoveda as number, signal),
    enabled: habilitado && idBoveda !== null,
  })

/** BOV-03 · Al cambiar de página o de orden se sigue viendo la tabla anterior */
export const useMovimientosBoveda = (idBoveda: number | null, params: Record<string, string>, habilitado: boolean) =>
  useQuery({
    ...SIEMPRE_FRESCO,
    queryKey: [...BOVEDAS_KEY, 'movimientos', idBoveda, params],
    queryFn: ({ signal }) => listarMovimientosBoveda(idBoveda as number, params, signal),
    enabled: habilitado && idBoveda !== null,
    placeholderData: keepPreviousData,
  })

/**
 * Tras una operación (o si su resultado es incierto) cambian saldos, denominaciones y movimientos de
 * una o varias bóvedas (un traslado toca dos): se vuelven a pedir todas las consultas de bóvedas.
 */
function useRefrescarBovedas() {
  const cache = useQueryClient()
  return () => cache.invalidateQueries({ queryKey: BOVEDAS_KEY })
}

/** BOV-04 · Sin reintento automático: el reintento lo decide quien opera, con la misma clave */
export function useRegistrarMovimiento(idBoveda: number) {
  const refrescar = useRefrescarBovedas()
  return useMutation({
    mutationFn: ({ movimiento, clave }: { movimiento: RegistrarMovimiento; clave: string }) =>
      registrarMovimiento(idBoveda, movimiento, clave),
    retry: false,
    onSuccess: refrescar,
    onError: (error) => {
      if (operacionSinConfirmar(error)) void refrescar()
    },
  })
}

/** BOV-05 · Registrar un arqueo no mueve efectivo: los ajustes llegan al aprobarlo */
export function useRegistrarArqueo(idBoveda: number) {
  return useMutation({
    mutationFn: (arqueo: RegistrarArqueo) => registrarArqueo(idBoveda, arqueo),
    retry: false,
  })
}

/** BOV-06 · Aprobar genera los ajustes: cambian saldo, denominaciones y movimientos */
export function useAprobarArqueo() {
  const refrescar = useRefrescarBovedas()
  return useMutation({
    mutationFn: aprobarArqueo,
    retry: false,
    onSuccess: refrescar,
    onError: (error) => {
      if (operacionSinConfirmar(error)) void refrescar()
    },
  })
}
