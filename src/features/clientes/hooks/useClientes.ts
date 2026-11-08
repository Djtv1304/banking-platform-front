import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  buscarCliente,
  getCliente,
  getDocumentosCliente,
  getMiPerfil,
  getMisDocumentos,
  subirDocumento,
} from '@/features/clientes/api/clientes.api'
import type { SubirDocumentoRequest, TipoIdentificacion } from '@/features/clientes/api/clientes.contract'

export const clientesKeys = {
  busqueda: (tipo: TipoIdentificacion, identificacion: string) => ['clientes', 'busqueda', tipo, identificacion] as const,
  detalle: (idCliente: number) => ['clientes', idCliente] as const,
  documentos: (idCliente: number) => ['clientes', idCliente, 'documentos'] as const,
  miPerfil: ['mi-perfil'] as const,
  misDocumentos: ['mi-perfil', 'documentos'] as const,
}

/** Solo consulta cuando hay un criterio válido */
export function useBuscarCliente(criterio: { tipoDocumento: TipoIdentificacion; identificacion: string } | null) {
  return useQuery({
    queryKey: clientesKeys.busqueda(criterio?.tipoDocumento ?? 'CEDULA', criterio?.identificacion ?? ''),
    queryFn: () => buscarCliente(criterio!.tipoDocumento, criterio!.identificacion),
    enabled: !!criterio,
  })
}

export function useCliente(idCliente: number) {
  return useQuery({ queryKey: clientesKeys.detalle(idCliente), queryFn: () => getCliente(idCliente), retry: false })
}

export function useDocumentosCliente(idCliente: number) {
  return useQuery({ queryKey: clientesKeys.documentos(idCliente), queryFn: () => getDocumentosCliente(idCliente) })
}

export function useSubirDocumento(idCliente: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: SubirDocumentoRequest) => subirDocumento(idCliente, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clientesKeys.documentos(idCliente) }),
  })
}

export function useMiPerfil() {
  return useQuery({ queryKey: clientesKeys.miPerfil, queryFn: getMiPerfil })
}

export function useMisDocumentos() {
  return useQuery({ queryKey: clientesKeys.misDocumentos, queryFn: getMisDocumentos })
}
