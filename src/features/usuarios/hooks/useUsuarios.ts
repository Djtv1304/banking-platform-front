import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'

import { ApiError } from '@/shared/api'
import { refreshSession } from '@/features/auth'
import {
  cambiarRolUsuario,
  cambioSinConfirmar,
  crearUsuario,
  editarUsuario,
  listarUsuarios,
  obtenerUsuario,
  trasladarUsuario,
} from '@/features/usuarios/api/usuarios.api'
import type { EdicionUsuario, RolUsuario, UsuarioDetalle } from '@/features/usuarios/api/usuarios.contract'

export const USUARIOS_KEY = ['usuarios'] as const
const LISTA_KEY = [...USUARIOS_KEY, 'lista'] as const
const detalleKey = (idUsuario: number | null) => [...USUARIOS_KEY, 'detalle', idUsuario] as const

/** Un 4xx (filtro inválido, sin permiso, inexistente, límite de solicitudes) no se arregla reintentando */
const reintentar = (fallos: number, error: Error) =>
  fallos < 1 && !(error instanceof ApiError && error.status !== null && error.status < 500)

/** AUT-05 · Mientras llega otra página u otro orden se sigue viendo la tabla anterior */
export const useUsuarios = (params: Record<string, string>, habilitado: boolean) =>
  useQuery({
    queryKey: [...LISTA_KEY, params],
    queryFn: ({ signal }) => listarUsuarios(params, signal),
    enabled: habilitado,
    placeholderData: keepPreviousData,
    retry: reintentar,
  })

/** AUT-06 · Al crear, el listado se vuelve a pedir para que aparezca el nuevo usuario */
export function useCrearUsuario() {
  const cache = useQueryClient()
  return useMutation({
    mutationFn: crearUsuario,
    retry: false,
    onSuccess: (usuario) => {
      cache.setQueryData(detalleKey(usuario.idUsuario), usuario)
      return cache.invalidateQueries({ queryKey: LISTA_KEY })
    },
  })
}

/** AUT-07 · `null` cuando el id de la URL no es válido: no se llama a la API */
export const useUsuario = (idUsuario: number | null, habilitado: boolean) =>
  useQuery({
    queryKey: detalleKey(idUsuario),
    queryFn: ({ signal }) => obtenerUsuario(idUsuario as number, signal),
    enabled: habilitado && idUsuario !== null,
    retry: reintentar,
  })

/**
 * Tras AUT-08/09 la respuesta ya es el detalle actualizado: se guarda tal cual (sin esperar otro GET)
 * y el listado se marca para volver a pedirse. Si el resultado es incierto se relee la ficha.
 */
async function confirmar(cache: QueryClient, usuario: UsuarioDetalle) {
  await cache.cancelQueries({ queryKey: detalleKey(usuario.idUsuario) })
  cache.setQueryData(detalleKey(usuario.idUsuario), usuario)
  return cache.invalidateQueries({ queryKey: LISTA_KEY })
}

function useCambioUsuario<T>(idUsuario: number, enviar: (valor: T) => Promise<UsuarioDetalle>, actualizarAgencias = false) {
  const cache = useQueryClient()
  return useMutation({
    mutationFn: enviar,
    retry: false,
    onSuccess: async (usuario) => {
      await confirmar(cache, usuario)
      if (actualizarAgencias) {
        await Promise.all([
          cache.invalidateQueries({ queryKey: ['usuarios', 'agencias', idUsuario] }),
          cache.invalidateQueries({ queryKey: ['usuarios', 'agencias-historial', idUsuario] }),
        ])
      }
      await refreshSession()
    },
    onError: (error) => {
      if (cambioSinConfirmar(error)) void cache.invalidateQueries({ queryKey: detalleKey(idUsuario) })
    },
  })
}

/** AUT-08 · Datos personales, agencia o estado */
export const useEditarUsuario = (idUsuario: number) =>
  useCambioUsuario(idUsuario, (cambios: EdicionUsuario) => editarUsuario(idUsuario, cambios))

export const useTrasladarUsuario = (idUsuario: number) =>
  useCambioUsuario(idUsuario, (idAgencia: string) => trasladarUsuario(idUsuario, idAgencia), true)

/** AUT-09 · Rol */
export const useCambiarRol = (idUsuario: number) =>
  useCambioUsuario(idUsuario, (roles: RolUsuario[]) => cambiarRolUsuario(idUsuario, roles))
