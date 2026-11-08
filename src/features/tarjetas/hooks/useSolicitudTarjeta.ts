import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  buscarClientePorIdentificacion,
  getCuentasCliente,
  getTarjetasCuenta,
  solicitarTarjeta,
} from '@/features/tarjetas/api/tarjetas.api'

/*
 * Consultas de la solicitud de tarjeta. A diferencia de los catálogos, cambian con cada
 * operación (cuentas, tarjetas emitidas), así que se piden de nuevo al volver a la pantalla.
 */

/** Se ejecuta solo cuando el asesor confirma la búsqueda (`identificacion` definida) */
export const useClientePorIdentificacion = (identificacion: string | undefined) =>
  useQuery({
    queryKey: ['tarjetas', 'cliente', identificacion],
    queryFn: () => buscarClientePorIdentificacion(identificacion as string),
    enabled: !!identificacion,
    retry: false,
  })

export const useCuentasCliente = (idCliente: number | undefined) =>
  useQuery({
    queryKey: ['tarjetas', 'cuentas', idCliente],
    queryFn: () => getCuentasCliente(idCliente as number),
    enabled: !!idCliente,
  })

/** Solo hace falta para elegir la titular de una extensión */
export const useTarjetasCuenta = (idCuenta: number | undefined, habilitado: boolean) =>
  useQuery({
    queryKey: ['tarjetas', 'por-cuenta', idCuenta],
    queryFn: () => getTarjetasCuenta(idCuenta as number),
    enabled: habilitado && !!idCuenta,
  })

export function useSolicitarTarjeta() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: solicitarTarjeta,
    // La cuenta tiene una tarjeta más: su lista ya no está al día
    onSuccess: (tarjeta) => queryClient.invalidateQueries({ queryKey: ['tarjetas', 'por-cuenta', tarjeta.idCuenta] }),
  })
}
