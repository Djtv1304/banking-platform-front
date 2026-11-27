import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  buscarClientePorIdentificacion,
  getCuentasCliente,
  getDireccionesCliente,
  getTarjetasPrincipalesCuenta,
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
export const useTarjetasPrincipales = (idCuenta: number | undefined, habilitado: boolean) =>
  useQuery({
    queryKey: ['tarjetas', 'por-cuenta', idCuenta],
    queryFn: () => getTarjetasPrincipalesCuenta(idCuenta as number),
    enabled: habilitado && !!idCuenta,
  })

/** Solo hace falta si la tarjeta se envía a domicilio */
export const useDireccionesCliente = (idCliente: number | undefined, habilitado: boolean) =>
  useQuery({
    queryKey: ['tarjetas', 'direcciones', idCliente],
    queryFn: () => getDireccionesCliente(idCliente as number),
    enabled: habilitado && !!idCliente,
  })

export function useSolicitarTarjeta() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: solicitarTarjeta,
    onSuccess: (tarjeta) => Promise.all([
      queryClient.invalidateQueries({ queryKey: ['tarjetas', 'por-cuenta', tarjeta.idCuenta] }),
      queryClient.invalidateQueries({ queryKey: ['tarjetas', 'buscar'] }),
      queryClient.invalidateQueries({ queryKey: ['tarjetas', 'por-renovar'] }),
      ...(tarjeta.idTarjetaReemplazada ? [queryClient.invalidateQueries({ queryKey: ['tarjetas', 'detalle', tarjeta.idTarjetaReemplazada] })] : []),
      queryClient.invalidateQueries({ queryKey: ['aprobaciones'] }),
    ]),
  })
}
