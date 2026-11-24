import { keepPreviousData, skipToken, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'

import { ApiError, toApiError } from '@/shared/api'
import { refreshSession } from '@/features/auth'
import {
  cambiarRolUsuario,
  cambioSinConfirmar,
  crearUsuario,
  editarUsuario,
  listarUsuarios,
  obtenerUsuario,
  mensajeErrorCambio,
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

type ResultadoCambio = Awaited<ReturnType<typeof cambiarRolUsuario>>
type SolicitudRoles = Extract<ResultadoCambio, { tipo: 'solicitud' }>['solicitud']
type Recuperacion = {
  mensaje: string
  recargarAgencias: boolean
  confirmar: (usuario: UsuarioDetalle) => boolean
}

const recuperacionKey = (idUsuario: number) => [...USUARIOS_KEY, 'recuperacion', idUsuario] as const
const solicitudKey = (idUsuario: number) => [...USUARIOS_KEY, 'solicitud-roles', idUsuario] as const

export function useRecuperacionUsuario(idUsuario: number) {
  return useQuery<Recuperacion | null>({
    queryKey: recuperacionKey(idUsuario),
    queryFn: skipToken,
    initialData: null,
    gcTime: Infinity,
  }).data
}

export function useSolicitudRoles(idUsuario: number) {
  return useQuery<SolicitudRoles | null>({
    queryKey: solicitudKey(idUsuario),
    queryFn: skipToken,
    initialData: null,
    gcTime: Infinity,
  }).data
}

async function actualizarAgencias(cache: QueryClient, idUsuario: number) {
  await Promise.all([
    cache.invalidateQueries({ queryKey: ['usuarios', 'agencias', idUsuario] }, { throwOnError: true }),
    cache.invalidateQueries({ queryKey: ['usuarios', 'agencias-historial', idUsuario] }),
  ])
}

export function useConsultarCambio(idUsuario: number) {
  const cache = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: async () => {
      const pendiente = cache.getQueryData<Recuperacion>(recuperacionKey(idUsuario))
      const usuario = await obtenerUsuario(idUsuario)
      const confirmado = pendiente?.confirmar(usuario) ?? true
      await confirmar(cache, usuario)
      if (pendiente?.recargarAgencias) await actualizarAgencias(cache, idUsuario)
      if (confirmado) cache.setQueryData(recuperacionKey(idUsuario), null)
      return confirmado
    },
  })
}

export function useFinalizarSolicitudRoles(idUsuario: number) {
  const cache = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: async (ejecutada: boolean) => {
      if (ejecutada) {
        await confirmar(cache, await obtenerUsuario(idUsuario))
        await actualizarAgencias(cache, idUsuario).catch(() => undefined)
      }
      cache.setQueryData(solicitudKey(idUsuario), null)
    },
  })
}

function useCambioUsuario<T, R extends UsuarioDetalle | ResultadoCambio>(
  idUsuario: number,
  enviar: (valor: T) => Promise<R>,
  verificar: (valor: T, usuario: UsuarioDetalle) => boolean,
  agencias = false,
  roles = false,
) {
  const cache = useQueryClient()
  const recuperacion = useRecuperacionUsuario(idUsuario)
  const solicitud = useSolicitudRoles(idUsuario)
  const mutacion = useMutation({
    scope: { id: 'usuarios-cambio-' + idUsuario },
    mutationFn: async (valor: T) => {
      if (cache.getQueryData(recuperacionKey(idUsuario)) || (roles && cache.getQueryData(solicitudKey(idUsuario)))) {
        throw new ApiError('Consulta el cambio pendiente antes de guardar.', 409, 'cambio_pendiente')
      }
      return enviar(valor)
    },
    retry: false,
    onSuccess: async (resultado) => {
      if ('tipo' in resultado && resultado.tipo === 'solicitud') {
        cache.setQueryData(solicitudKey(idUsuario), resultado.solicitud)
        await cache.invalidateQueries({ queryKey: ['aprobaciones'] })
        return
      }
      await confirmar(cache, 'tipo' in resultado ? resultado.usuario : resultado)
      if (agencias) await actualizarAgencias(cache, idUsuario).catch(() => undefined)
      await refreshSession()
    },
    onError: (error, valor) => {
      if (!cambioSinConfirmar(error)) return
      const { code } = toApiError(error)
      cache.setQueryData<Recuperacion>(recuperacionKey(idUsuario), {
        mensaje: mensajeErrorCambio(error),
        recargarAgencias: code === 'ASIGNACIONES_CAJA_OCUPADAS' || agencias,
        confirmar: (usuario) => code === 'ASIGNACIONES_CAJA_OCUPADAS' || verificar(valor, usuario),
      })
    },
  })
  return { ...mutacion, bloqueado: !!recuperacion || (roles && !!solicitud) }
}

/** AUT-08 */
export const useEditarUsuario = (idUsuario: number) =>
  useCambioUsuario(idUsuario, (cambios: EdicionUsuario) => editarUsuario(idUsuario, cambios), (cambios, usuario) => {
    if ('email' in cambios && cambios.email !== undefined) return usuario.email.toLowerCase() === cambios.email.toLowerCase()
    if ('estado' in cambios) return usuario.estado === cambios.estado
    return Object.entries(cambios).every(([campo, valor]) => usuario[campo as keyof UsuarioDetalle] === valor)
  })

export const useTrasladarUsuario = (idUsuario: number) =>
  useCambioUsuario(idUsuario, (idAgencia: string) => trasladarUsuario(idUsuario, idAgencia), (idAgencia, usuario) => usuario.idAgencia === idAgencia, true)

/** AUT-09 */
export const useCambiarRol = (idUsuario: number) =>
  useCambioUsuario(idUsuario, (roles: RolUsuario[]) => cambiarRolUsuario(idUsuario, roles), (roles, usuario) => {
    const actuales = usuario.roles ?? (usuario.rol ? [usuario.rol] : [])
    return roles.length === actuales.length && roles.every((rol) => actuales.includes(rol))
  }, true, true)
