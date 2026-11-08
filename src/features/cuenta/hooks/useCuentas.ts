import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { cambiarEstadoCuenta, getCuentasCliente } from '@/features/cuenta/api/cuenta.api'
import type { CambiarEstadoCuentaRequest } from '@/features/cuenta/api/cuenta.contract'

export const cuentasKeys = {
  cliente: (idCliente: number) => ['cuentas', 'cliente', idCliente] as const,
}

export function useCuentasCliente(idCliente: number) {
  return useQuery({
    queryKey: cuentasKeys.cliente(idCliente),
    queryFn: () => getCuentasCliente(idCliente),
  })
}

export function useCambiarEstadoCuenta(idCliente: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ idCuenta, ...request }: CambiarEstadoCuentaRequest & { idCuenta: number }) =>
      cambiarEstadoCuenta(idCuenta, request),
    onSettled: () => queryClient.invalidateQueries({ queryKey: cuentasKeys.cliente(idCliente) }),
  })
}
