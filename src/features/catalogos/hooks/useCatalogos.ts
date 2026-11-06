import { useQuery } from '@tanstack/react-query'

import type { ActividadEconomica, Ciudad, Pais } from '@/features/catalogos/api/catalogos.contract'
import { apiClient } from '@/shared/api'

export const catalogosQueryKey = ['catalogos'] as const

const opcionesSesion = { staleTime: Infinity, gcTime: Infinity }
const base = '/api/v1/catalogos'

export const usePaises = () =>
  useQuery({
    ...opcionesSesion,
    queryKey: [...catalogosQueryKey, 'paises'],
    queryFn: async ({ signal }) => (await apiClient.get<Pais[]>(`${base}/paises`, { signal })).data,
  })

export const useCiudades = (codigoPais: string | undefined) =>
  useQuery({
    ...opcionesSesion,
    queryKey: [...catalogosQueryKey, 'ciudades', codigoPais],
    enabled: !!codigoPais,
    queryFn: async ({ signal }) =>
      (await apiClient.get<Ciudad[]>(`${base}/paises/${encodeURIComponent(codigoPais ?? '')}/ciudades`, { signal })).data,
  })

export const useActividadesEconomicas = () =>
  useQuery({
    ...opcionesSesion,
    queryKey: [...catalogosQueryKey, 'actividades-economicas'],
    queryFn: async ({ signal }) =>
      (await apiClient.get<ActividadEconomica[]>(`${base}/actividades-economicas`, { signal })).data,
  })
