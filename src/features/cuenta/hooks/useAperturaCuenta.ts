import { useMutation, useQueryClient } from '@tanstack/react-query'

import { abrirCuenta } from '@/features/cuenta/api/apertura.api'

/** CTA-01 · Sin reintento (mutación); al abrirla, las búsquedas de cuentas ya no están al día */
export function useAbrirCuenta() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: abrirCuenta,
    onSuccess: (cuenta) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['cuentas'] }),
        // Cuentas del cliente que lista la solicitud de tarjeta (A-04)
        queryClient.invalidateQueries({ queryKey: ['tarjetas', 'cuentas', cuenta.idCliente] }),
      ]),
  })
}
