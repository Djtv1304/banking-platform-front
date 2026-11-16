import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  cambiarEstadoCuentaContable,
  crearCuentaContable,
  eliminarCuentaContable,
  renombrarCuentaContable,
} from '@/features/contabilidad/api/contabilidad.api'
import type { CuentaContableCreate, EstadoCuentaContable } from '@/features/contabilidad/api/contabilidad.contract'
import { CLAVE_PLAN_CUENTAS } from '@/features/contabilidad/hooks/usePlanCuentas'

/*
 * Mantenimiento del plan (contrato propuesto). Sin reintento: una escritura no se repite sola.
 * Tras cada respuesta correcta, también un 202 pendiente, se vuelve a pedir el plan.
 */

function useInvalidarPlan() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: CLAVE_PLAN_CUENTAS })
}

export function useCrearCuenta() {
  const invalidar = useInvalidarPlan()
  return useMutation({ mutationFn: (body: CuentaContableCreate) => crearCuentaContable(body), retry: false, onSuccess: invalidar })
}

export function useRenombrarCuenta() {
  const invalidar = useInvalidarPlan()
  return useMutation({
    mutationFn: ({ id, nombreCuenta }: { id: number; nombreCuenta: string }) => renombrarCuentaContable(id, nombreCuenta),
    retry: false,
    onSuccess: invalidar,
  })
}

export function useCambiarEstadoCuenta() {
  const invalidar = useInvalidarPlan()
  return useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: EstadoCuentaContable }) => cambiarEstadoCuentaContable(id, estado),
    retry: false,
    onSuccess: invalidar,
  })
}

export function useEliminarCuenta() {
  const invalidar = useInvalidarPlan()
  return useMutation({ mutationFn: (id: number) => eliminarCuentaContable(id), retry: false, onSuccess: invalidar })
}
