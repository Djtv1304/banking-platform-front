import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  getAsignacionesTipo,
  getClasesCuenta,
  getCuentasSubproducto,
  solicitarAsignaciones,
} from '@/features/contabilidad/api/cuentas-producto.api'
import type { CambioAsignacion } from '@/features/contabilidad/api/cuentas-producto.contract'

const CLAVE = ['contabilidad', 'cuentas-producto'] as const

export const useClasesCuenta = () => useQuery({ queryKey: [...CLAVE, 'clases'], queryFn: getClasesCuenta })

export const useAsignacionesTipo = (idTipo: number | null) =>
  useQuery({
    queryKey: [...CLAVE, 'tipo', idTipo],
    queryFn: () => getAsignacionesTipo(idTipo as number),
    enabled: idTipo !== null,
  })

export const useCuentasSubproducto = (idSub: number) =>
  useQuery({ queryKey: [...CLAVE, 'subproducto', idSub], queryFn: () => getCuentasSubproducto(idSub), enabled: idSub > 0 })

export function useSolicitarAsignaciones(idTipo: number) {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (cambios: CambioAsignacion[]) => solicitarAsignaciones(idTipo, cambios),
    onSuccess: () => cliente.invalidateQueries({ queryKey: CLAVE }),
  })
}
