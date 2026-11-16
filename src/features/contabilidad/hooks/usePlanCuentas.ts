import { useQuery } from '@tanstack/react-query'

import { getCuentasContables } from '@/features/contabilidad/api/contabilidad.api'

export const CLAVE_PLAN_CUENTAS = ['contabilidad', 'cuentas-contables'] as const

/** CON-03 · El plan entero (~1.200 cuentas) una sola vez; se invalida tras cada cambio */
export const usePlanCuentas = () => useQuery({ queryKey: CLAVE_PLAN_CUENTAS, queryFn: getCuentasContables })
