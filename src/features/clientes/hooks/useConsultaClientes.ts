import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { buscarClientes, getCliente } from '@/features/clientes/api/clientes.api'
import type { ParametrosBusqueda } from '@/features/clientes/api/clientes.contract'

/*
 * Consultas de clientes (C-03). Los datos cambian con cada registro o edición, así que no se
 * guardan por sesión como los catálogos: se piden de nuevo al volver a la pantalla.
 */

/** CLI-03 · Al cambiar de página se mantiene la anterior a la vista hasta que llega la nueva */
export const useBuscarClientes = (params: ParametrosBusqueda) =>
  useQuery({
    queryKey: ['clientes', 'busqueda', params],
    queryFn: ({ signal }) => buscarClientes(params, signal),
    placeholderData: keepPreviousData,
  })

/** CLI-04 · Sin reintento: un 404 se muestra en cuanto llega */
export const useCliente = (idCliente: number | undefined) =>
  useQuery({
    queryKey: ['clientes', 'detalle', idCliente],
    queryFn: ({ signal }) => getCliente(idCliente as number, signal),
    enabled: idCliente !== undefined,
    retry: false,
  })
