import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { buscarClientes, getCliente } from '@/features/clientes/api/clientes.api'
import type { ParametrosBusqueda } from '@/features/clientes/api/clientes.contract'

/*
 * Consultas de clientes (C-03). Los datos cambian con cada registro o edición, así que no se
 * guardan por sesión como los catálogos: se piden de nuevo al volver a la pantalla.
 * Llegan enmascarados y la caché es solo en memoria (nada se persiste en el navegador).
 */

/** CLI-03 · Sin filtro (`null`) no se consulta. Al cambiar de página se mantiene la anterior a la vista */
export const useBuscarClientes = (params: ParametrosBusqueda | null) =>
  useQuery({
    queryKey: ['clientes', 'busqueda', params],
    queryFn: ({ signal }) => buscarClientes(params as ParametrosBusqueda, signal),
    enabled: params !== null,
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
