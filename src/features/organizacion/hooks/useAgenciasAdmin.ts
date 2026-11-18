import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { actualizarAgencia, cambiarEstadoAgencia, crearAgencia, listarAgencias, obtenerAgencia } from '@/features/organizacion/api/agencias.api'
import type { AgenciaEstadoUpdate, AgenciaUpdate } from '@/features/organizacion/api/agencias.contract'

const CLAVE_ADMIN = ['organizacion', 'agencias'] as const
const CLAVE_CATALOGO = ['catalogos', 'agencias'] as const

export function useAgenciasAdmin() {
  return useQuery({
    queryKey: [...CLAVE_ADMIN, 'lista'],
    queryFn: ({ signal }) => listarAgencias(signal),
    staleTime: 0,
    retry: false,
  })
}

export function useAgenciaDetalle(idAgencia: string | null) {
  return useQuery({
    queryKey: [...CLAVE_ADMIN, 'detalle', idAgencia],
    queryFn: ({ signal }) => obtenerAgencia(idAgencia ?? '', signal),
    enabled: idAgencia !== null,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  })
}

function useInvalidarAgencias() {
  const client = useQueryClient()
  return () => Promise.all([
    client.invalidateQueries({ queryKey: CLAVE_ADMIN }),
    client.invalidateQueries({ queryKey: CLAVE_CATALOGO }),
  ])
}

export function useCrearAgencia() {
  const invalidar = useInvalidarAgencias()
  return useMutation({ mutationFn: crearAgencia, retry: false, onSuccess: invalidar })
}

export function useActualizarAgencia() {
  const invalidar = useInvalidarAgencias()
  return useMutation({
    mutationFn: ({ idAgencia, body }: { idAgencia: string; body: AgenciaUpdate }) => actualizarAgencia(idAgencia, body),
    retry: false,
    onSuccess: invalidar,
  })
}

export function useCambiarEstadoAgencia() {
  const client = useQueryClient()
  const invalidar = useInvalidarAgencias()
  return useMutation({
    mutationFn: ({ idAgencia, body }: { idAgencia: string; body: AgenciaEstadoUpdate }) => cambiarEstadoAgencia(idAgencia, body),
    retry: false,
    onSuccess: (resultado) => 'idSolicitud' in resultado
      ? client.invalidateQueries({ queryKey: ['aprobaciones'] })
      : invalidar(),
  })
}
