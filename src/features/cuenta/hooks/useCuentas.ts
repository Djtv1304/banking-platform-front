import { useQuery } from '@tanstack/react-query'

import { ApiError } from '@/shared/api'
import { useAgencias, useProductos } from '@/features/catalogos'
import { buscarCuentas, buscarIdCliente, getCuenta, getSaldoCuenta } from '@/features/cuenta/api/cuentas.api'
import { etiquetaAgencia } from '@/features/cuenta/lib/formato'

/*
 * Consultas de cuentas (A-02). Cambian con cada operación (depósitos, retiros, cambios de estado),
 * así que no se guardan por sesión como los catálogos.
 */

/** Un 4xx (cuenta inexistente, filtro inválido, sin permiso) no se arregla reintentando */
const reintentar = (fallos: number, error: Error) =>
  fallos < 1 && !(error instanceof ApiError && error.status !== null && error.status < 500)

/** CLI-03 · Se ejecuta solo si se filtra por cliente (`identificacion` definida) */
export const useIdCliente = (identificacion: string | undefined) =>
  useQuery({
    queryKey: ['cuentas', 'cliente', identificacion],
    queryFn: () => buscarIdCliente(identificacion as string),
    enabled: !!identificacion,
    retry: reintentar,
  })

/** CTA-02 · `habilitado` en false mientras falta resolver el cliente del filtro */
export const useBuscarCuentas = (params: Record<string, string>, habilitado: boolean) =>
  useQuery({
    queryKey: ['cuentas', 'buscar', params],
    queryFn: () => buscarCuentas(params),
    enabled: habilitado,
    retry: reintentar,
  })

/** CTA-03 · `null` cuando el id de la URL no es válido: no se llama a la API */
export const useCuenta = (idCuenta: number | null) =>
  useQuery({
    queryKey: ['cuentas', 'detalle', idCuenta],
    queryFn: () => getCuenta(idCuenta as number),
    enabled: idCuenta !== null,
    retry: reintentar,
  })

/** CTA-04 · Siempre se pide de nuevo al abrir el detalle: el saldo cambia con cada movimiento */
export const useSaldoCuenta = (idCuenta: number | null) =>
  useQuery({
    queryKey: ['cuentas', 'saldo', idCuenta],
    queryFn: () => getSaldoCuenta(idCuenta as number),
    enabled: idCuenta !== null,
    retry: reintentar,
    staleTime: 0,
  })

/** Nombres legibles del producto y la agencia de una cuenta, a partir de los catálogos */
export function useNombresCuenta() {
  const { data: productos } = useProductos('Cuenta')
  const { data: agencias } = useAgencias()

  return {
    producto: (idProducto: number) =>
      productos.find((producto) => producto.idProducto === idProducto)?.nombreProducto ?? `Producto ${idProducto}`,
    agencia: (idAgencia: string) => {
      const agencia = agencias.find((item) => item.idAgencia === idAgencia)
      return agencia ? etiquetaAgencia(agencia) : idAgencia
    },
  }
}
