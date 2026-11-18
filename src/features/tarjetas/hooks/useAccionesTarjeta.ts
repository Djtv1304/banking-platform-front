import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ApiError } from '@/shared/api'
import { usePuedeFuncion, useAuthStore, usePermisos } from '@/features/auth'
import {
  cambiarEstadoTarjeta,
  descargarSobrePin,
  getHistorialTarjeta,
  regenerarPin,
} from '@/features/tarjetas/api/tarjetas.api'
import type { TarjetaEstadoUpdate } from '@/features/tarjetas/api/tarjetas.contract'
import { permisosTarjeta } from '@/features/tarjetas/lib/acciones-tarjeta'
import { type FiltroHistorial, parametrosHistorial } from '@/features/tarjetas/lib/historial-tarjeta'
import { guardarArchivo, nombreSobrePin } from '@/features/tarjetas/lib/sobre-pin'

/* Estado, PIN e historial de una tarjeta (A-05). Las escrituras no se reintentan */

const reintentar = (fallos: number, error: Error) =>
  fallos < 1 && !(error instanceof ApiError && error.status !== null && error.status < 500)

/**
 * Tras una escritura (o su fallo: un 409 o 503 puede venir de una tarjeta que ya cambió) se piden de
 * nuevo el detalle, la búsqueda y el historial.
 */
function useRefrescarTarjeta(idTarjeta: number) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['tarjetas', 'detalle', idTarjeta] }),
      queryClient.invalidateQueries({ queryKey: ['tarjetas', 'buscar'] }),
      queryClient.invalidateQueries({ queryKey: ['tarjetas', 'historial', idTarjeta] }),
    ])
}

/** TAR-04 */
export function useCambiarEstadoTarjeta(idTarjeta: number) {
  const refrescar = useRefrescarTarjeta(idTarjeta)
  return useMutation({
    mutationFn: (body: TarjetaEstadoUpdate) => cambiarEstadoTarjeta(idTarjeta, body),
    retry: false,
    onSettled: refrescar,
  })
}

/** TAR-05 */
export function useRegenerarPin(idTarjeta: number) {
  const refrescar = useRefrescarTarjeta(idTarjeta)
  return useMutation({ mutationFn: () => regenerarPin(idTarjeta), retry: false, onSettled: refrescar })
}

/**
 * TAR-07 · Se entrega una sola vez: nunca se reintenta. El PDF se guarda como archivo dentro de la
 * mutación para que no quede en su `data` ni en ninguna caché.
 */
export const useDescargarSobrePin = (idTarjeta: number) =>
  useMutation({
    mutationFn: async () => guardarArchivo(await descargarSobrePin(idTarjeta), nombreSobrePin(idTarjeta)),
    retry: false,
  })

/** TAR-06 */
export const useHistorialTarjeta = (idTarjeta: number, filtro: FiltroHistorial, page: number) =>
  useQuery({
    queryKey: ['tarjetas', 'historial', idTarjeta, filtro, page],
    queryFn: () => getHistorialTarjeta(idTarjeta, parametrosHistorial(filtro, page)),
    retry: reintentar,
    placeholderData: keepPreviousData,
  })

/** Acciones visibles según los roles y permisos reales de /auth/me */
export function usePermisosTarjeta() {
  // Se elige el arreglo (referencia estable) y no un objeto nuevo en cada render
  const roles = useAuthStore((state) => state.user?.roles)
  const anterior = permisosTarjeta(roles ?? [], usePermisos())
  return { estado: usePuedeFuncion('tarjetas.cambiarEstado', anterior.estado), pin: usePuedeFuncion('tarjetas.asignarPin', anterior.pin), sobrePin: usePuedeFuncion('tarjetas.verSobrePin', anterior.sobrePin), historial: usePuedeFuncion('tarjetas.verHistorial', anterior.historial) }
}
