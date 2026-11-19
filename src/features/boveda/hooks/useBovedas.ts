import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ApiError } from '@/shared/api'
import {
  aprobarArqueo,
  aprobarSolicitudMovimiento,
  cancelarSolicitudMovimiento,
  crearSolicitudMovimiento,
  listarArqueosBoveda,
  listarBovedas,
  listarMovimientosBoveda,
  listarSolicitudesMovimiento,
  obtenerBoveda,
  obtenerSolicitudMovimiento,
  operacionSinConfirmar,
  rechazarSolicitudMovimiento,
  registrarArqueo,
} from '@/features/boveda/api/bovedas.api'
import type { CrearSolicitudMovimiento, RegistrarArqueo } from '@/features/boveda/api/bovedas.contract'

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

/** BOV-07 · Al cambiar de página o de filtro se sigue viendo la tabla anterior */
export const useArqueosBoveda = (idBoveda: number, params: Record<string, string>, habilitado: boolean) =>
  useQuery({
    ...SIEMPRE_FRESCO,
    queryKey: [...BOVEDAS_KEY, 'arqueos', idBoveda, params],
    queryFn: ({ signal }) => listarArqueosBoveda(idBoveda, params, signal),
    enabled: habilitado,
    placeholderData: keepPreviousData,
  })

/* Las solicitudes cuelgan de BOVEDAS_KEY: al resolverse una cambian también saldos y movimientos */

/** SMV-02 · Cola de solicitudes; la resuelve otra sesión, por eso nunca se reutiliza */
export const useSolicitudesMovimiento = (params: Record<string, string>, habilitado: boolean) =>
  useQuery({
    ...SIEMPRE_FRESCO,
    queryKey: [...BOVEDAS_KEY, 'solicitudes', params],
    queryFn: ({ signal }) => listarSolicitudesMovimiento(params, signal),
    enabled: habilitado,
    placeholderData: keepPreviousData,
  })

/** SMV-03 · `null` cuando el id de la URL no es válido: no se llama a la API */
export const useSolicitudMovimiento = (idSolicitud: number | null, habilitado: boolean) =>
  useQuery({
    ...SIEMPRE_FRESCO,
    queryKey: [...BOVEDAS_KEY, 'solicitud', idSolicitud],
    queryFn: ({ signal }) => obtenerSolicitudMovimiento(idSolicitud as number, signal),
    enabled: habilitado && idSolicitud !== null,
  })

/**
 * Tras una operación (o si su resultado es incierto) cambian saldos, denominaciones, movimientos,
 * arqueos o solicitudes de una o varias bóvedas (un traslado toca dos): se vuelven a pedir todas.
 */
function useRefrescarBovedas() {
  const cache = useQueryClient()
  return () => cache.invalidateQueries({ queryKey: BOVEDAS_KEY })
}

/** Mutación sin reintento automático que refresca las bóvedas al terminar o si el resultado es incierto */
function useOperacionBoveda<V, R>(mutationFn: (variables: V) => Promise<R>) {
  const refrescar = useRefrescarBovedas()
  return useMutation({
    mutationFn,
    retry: false,
    onSuccess: refrescar,
    onError: (error) => {
      if (operacionSinConfirmar(error)) void refrescar()
    },
  })
}

/** SMV-01 · El reintento lo decide quien opera, con la misma clave */
export const useCrearSolicitudMovimiento = (idBoveda: number) =>
  useOperacionBoveda(({ solicitud, clave }: { solicitud: CrearSolicitudMovimiento; clave: string }) =>
    crearSolicitudMovimiento(idBoveda, solicitud, clave),
  )

/** SMV-04 · Ejecuta el movimiento: cambian saldos, denominaciones y movimientos */
export const useAprobarSolicitudMovimiento = () => useOperacionBoveda(aprobarSolicitudMovimiento)

/** SMV-05 */
export const useRechazarSolicitudMovimiento = () =>
  useOperacionBoveda(({ idSolicitud, motivo }: { idSolicitud: number; motivo: string }) => rechazarSolicitudMovimiento(idSolicitud, motivo))

/** SMV-06 */
export const useCancelarSolicitudMovimiento = () =>
  useOperacionBoveda(({ idSolicitud, motivo }: { idSolicitud: number; motivo: string }) => cancelarSolicitudMovimiento(idSolicitud, motivo))

/** BOV-05 · Registrar un arqueo no mueve efectivo (los ajustes llegan al aprobarlo), pero aparece en BOV-07 */
export const useRegistrarArqueo = (idBoveda: number) => useOperacionBoveda((arqueo: RegistrarArqueo) => registrarArqueo(idBoveda, arqueo))

/** BOV-06 · Aprobar genera los ajustes: cambian saldo, denominaciones, movimientos y el arqueo */
export const useAprobarArqueo = () => useOperacionBoveda(aprobarArqueo)
