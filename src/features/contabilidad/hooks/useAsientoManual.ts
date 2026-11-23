import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  actualizarAsiento,
  anularAsiento,
  crearAsiento,
  enviarAsiento,
  solicitarReverso,
} from '@/features/contabilidad/api/asientos.api'
import type { AsientoManual } from '@/features/contabilidad/api/asientos.contract'

const CLAVE_ASIENTOS = ['contabilidad', 'asientos'] as const

/** E4-04 · Crea el borrador (`idAsiento` null) o lo actualiza; devuelve siempre el id */
export function useGuardarAsiento() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: async ({ idAsiento, asiento }: { idAsiento: number | null; asiento: AsientoManual }) => {
      if (idAsiento === null) return (await crearAsiento(asiento)).idAsientoContable
      await actualizarAsiento(idAsiento, asiento)
      return idAsiento
    },
    onSuccess: () => cliente.invalidateQueries({ queryKey: CLAVE_ASIENTOS }),
  })
}

/** E4-04 · Envío a aprobación; refresca también la bandeja de aprobaciones */
export function useEnviarAsiento() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (idAsiento: number) => enviarAsiento(idAsiento),
    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: CLAVE_ASIENTOS })
      void cliente.invalidateQueries({ queryKey: ['aprobaciones'] })
    },
  })
}

/** E4-04 · Anula un borrador con su motivo */
export function useAnularAsiento() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: ({ idAsiento, motivo }: { idAsiento: number; motivo: string }) => anularAsiento(idAsiento, motivo),
    onSuccess: () => cliente.invalidateQueries({ queryKey: CLAVE_ASIENTOS }),
  })
}

/** E4-04 · Solicita el reverso de un asiento manual contabilizado; refresca también las aprobaciones */
export function useSolicitarReverso() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: ({ idAsiento, motivo }: { idAsiento: number; motivo: string }) => solicitarReverso(idAsiento, motivo),
    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: CLAVE_ASIENTOS })
      void cliente.invalidateQueries({ queryKey: ['aprobaciones'] })
    },
  })
}
