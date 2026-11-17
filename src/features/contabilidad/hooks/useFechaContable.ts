import { useQueries, useQuery } from '@tanstack/react-query'

import { ApiError } from '@/shared/api'
import { getFechaContable, getFechaContableActual } from '@/features/contabilidad/api/fecha-contable.api'

/** Un 4xx (fecha inválida, fuera del calendario, sin permiso) no se arregla reintentando */
const reintentar = (fallos: number, error: Error) =>
  fallos < 1 && !(error instanceof ApiError && error.status !== null && error.status < 500)

const opcionesFecha = (fecha: string) => ({
  queryKey: ['contabilidad', 'fecha-contable', 'fecha', fecha],
  queryFn: () => getFechaContable(fecha),
  retry: reintentar,
})

/** CON-01 · La fecha contable vigente */
export const useFechaContableActual = () =>
  useQuery({
    queryKey: ['contabilidad', 'fecha-contable', 'actual'],
    queryFn: getFechaContableActual,
    retry: reintentar,
  })

/** CON-01 · Una fecha del calendario; `null` = nada que consultar todavía */
export const useFechaContable = (fecha: string | null) =>
  useQuery({
    ...opcionesFecha(fecha ?? ''),
    enabled: fecha !== null,
  })

/** CON-01 · Varias fechas a la vez (una consulta por día, comparten caché con `useFechaContable`) */
export const useFechasContables = (fechas: readonly string[]) =>
  useQueries({ queries: fechas.map(opcionesFecha) })
