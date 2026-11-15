import { useQuery, type UseQueryOptions } from '@tanstack/react-query'

import {
  getActividadesEconomicas,
  getAgencias,
  getCanales,
  getCiudades,
  getDenominaciones,
  getPaises,
  getProductos,
  getRedes,
  getTiposAntecedente,
  getTiposCredito,
  getTiposMovimientoCaja,
} from '@/features/catalogos/api/catalogos.api'
import type { TipoProducto, TipoTarjeta } from '@/features/catalogos/api/catalogos.contract'

/*
 * Catálogos con caché por sesión (F-09).
 *
 * Los catálogos casi no cambian (se mantienen por semilla, F-07): cada uno se pide una sola vez y
 * se reutiliza en todos los formularios. La caché vive en memoria y dura lo que dura la sesión:
 * el login y el logout terminan en una carga completa de la página (redirecciones de WorkOS),
 * que la vacía.
 *
 * Mientras cargan, o si fallan, `data` es `[]`: los formularios pueden usar `data.map(...)` sin
 * comprobar `undefined`. `isLoading` e `isError` siguen disponibles para mostrar el estado.
 */

const POR_SESION = { staleTime: Infinity, gcTime: Infinity } as const

const VACIO: never[] = []

function useCatalogo<T>(options: UseQueryOptions<T[]>) {
  const query = useQuery({ ...POR_SESION, ...options })
  return { ...query, data: query.data ?? (VACIO as T[]) }
}

export const usePaises = () => useCatalogo({ queryKey: ['catalogos', 'paises'], queryFn: getPaises })

/** Ciudades de un país (vacío hasta elegir el país) */
export const useCiudades = (codigoPais: string | undefined) =>
  useCatalogo({
    queryKey: ['catalogos', 'ciudades', codigoPais],
    queryFn: () => getCiudades(codigoPais as string),
    enabled: !!codigoPais,
  })

/** Solo activas (las filtra el backend) */
export const useActividadesEconomicas = () =>
  useCatalogo({ queryKey: ['catalogos', 'actividades-economicas'], queryFn: getActividadesEconomicas })

export const useTiposAntecedente = () =>
  useCatalogo({ queryKey: ['catalogos', 'tipos-antecedente'], queryFn: getTiposAntecedente })

export const useDenominaciones = () =>
  useCatalogo({ queryKey: ['catalogos', 'denominaciones'], queryFn: getDenominaciones })

/** Todas las agencias con su estado: para crear operaciones, ofrecer solo las de `estado === 'A'` */
export const useAgencias = () => useCatalogo({ queryKey: ['catalogos', 'agencias'], queryFn: getAgencias })

/**
 * Sin `tipo`, todos los productos activos; con `tipo`, solo los de ese tipo. Con `tipoTarjeta`, solo
 * los subproductos de tarjeta de ese tipo: al cambiarlo en el formulario de emisión cambia la clave
 * y se cargan (una vez por sesión) las opciones congruentes.
 */
export const useProductos = (tipo?: TipoProducto, tipoTarjeta?: TipoTarjeta) =>
  useCatalogo({
    queryKey: ['catalogos', 'productos', tipo ?? 'todos', tipoTarjeta ?? 'todas'],
    queryFn: () => getProductos(tipo, tipoTarjeta),
  })

export const useRedes = () => useCatalogo({ queryKey: ['catalogos', 'redes'], queryFn: getRedes })

export const useCanales = () => useCatalogo({ queryKey: ['catalogos', 'canales'], queryFn: getCanales })

export const useTiposCredito = () =>
  useCatalogo({ queryKey: ['catalogos', 'tipos-credito'], queryFn: getTiposCredito })

export const useTiposMovimientoCaja = () =>
  useCatalogo({ queryKey: ['catalogos', 'tipos-movimiento-caja'], queryFn: getTiposMovimientoCaja })
