import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ApiError } from '@/shared/api'
import {
  abrirJornada,
  listarCajasFisicas,
  listarDotaciones,
  listarUltimosMovimientos,
  obtenerJornadaActual,
  operacionSinConfirmar,
} from '@/features/caja/api/caja.api'

export const CAJA_KEY = ['caja'] as const

/** Cuántas operaciones muestra el inicio de ventanilla */
export const ULTIMAS_OPERACIONES = 10

/** Un 4xx (sin permiso, no vinculado, inexistente) no se arregla reintentando */
const reintentar = (fallos: number, error: Error) =>
  fallos < 1 && !(error instanceof ApiError && error.status !== null && error.status < 500)

/* El efectivo de la ventanilla cambia con cada operación: nada se reutiliza entre visitas */
const SIEMPRE_FRESCO = { staleTime: 0, retry: reintentar } as const

/** CAJ-04 · `data` es `null` cuando el cajero no tiene jornada abierta */
export const useJornadaActual = (habilitado: boolean) =>
  useQuery({
    ...SIEMPRE_FRESCO,
    queryKey: [...CAJA_KEY, 'jornada-actual'],
    queryFn: ({ signal }) => obtenerJornadaActual(signal),
    enabled: habilitado,
  })

/** CAJ-01 · Solo hace falta mientras no hay jornada abierta */
export const useCajasFisicas = (habilitado: boolean) =>
  useQuery({
    ...SIEMPRE_FRESCO,
    queryKey: [...CAJA_KEY, 'cajas-fisicas'],
    queryFn: ({ signal }) => listarCajasFisicas(signal),
    enabled: habilitado,
  })

/** CAJ-08 */
export const useDotaciones = (idJornada: number | null) =>
  useQuery({
    ...SIEMPRE_FRESCO,
    queryKey: [...CAJA_KEY, 'dotaciones', idJornada],
    queryFn: ({ signal }) => listarDotaciones(idJornada as number, signal),
    enabled: idJornada !== null,
  })

/** CAJ-12 · Primera página ordenada por fecha descendente */
export const useUltimosMovimientos = (idJornada: number | null) =>
  useQuery({
    ...SIEMPRE_FRESCO,
    queryKey: [...CAJA_KEY, 'movimientos', idJornada, ULTIMAS_OPERACIONES],
    queryFn: ({ signal }) => listarUltimosMovimientos(idJornada as number, ULTIMAS_OPERACIONES, signal),
    enabled: idJornada !== null,
  })

/**
 * CAJ-03 · Sin reintento automático. Al terminar, o si el resultado es incierto, se vuelve a pedir la
 * jornada actual: es la fuente de verdad de si quedó abierta.
 */
export function useAbrirJornada() {
  const cache = useQueryClient()
  const refrescar = () => cache.invalidateQueries({ queryKey: CAJA_KEY })
  return useMutation({
    mutationFn: abrirJornada,
    retry: false,
    onSuccess: refrescar,
    onError: (error) => {
      const e = error instanceof ApiError ? error : null
      if (operacionSinConfirmar(error) || e?.code === 'CAJERO_YA_TIENE_JORNADA_ABIERTA') void refrescar()
      else if (e?.code === 'CAJA_EN_USO' || e?.code === 'CAJA_INACTIVA' || e?.code === 'CAJA_FISICA_NO_ENCONTRADA') {
        void cache.invalidateQueries({ queryKey: [...CAJA_KEY, 'cajas-fisicas'] })
      }
    },
  })
}
