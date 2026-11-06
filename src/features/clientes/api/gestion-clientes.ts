import { apiClient } from '@/shared/api'

export const estadosCliente = ['Pendiente', 'Activo', 'Bloqueado', 'Inactivo', 'Cerrado', 'Eliminado', 'Suspendido'] as const
export type EstadoCliente = (typeof estadosCliente)[number]
export type EstadoDestino = Exclude<EstadoCliente, 'Pendiente' | 'Cerrado'>
export type TipoCliente = 'Natural' | 'Juridico'

export interface Cliente {
  idCliente: number
  identificacion: string
  tipoCliente: TipoCliente
  nombres: string
  apellidos: string | null
  razonSocial: string | null
  nombreComercial: string | null
  idActividadEconomica: number | null
  estadoCivil: string | null
  telefonoConvencional: string | null
  telefonoCelular: string
  email: string
  estado: EstadoCliente
}

export type ClienteUpdate = Partial<Pick<Cliente,
  'nombres' | 'apellidos' | 'razonSocial' | 'nombreComercial' | 'idActividadEconomica' |
  'estadoCivil' | 'telefonoConvencional' | 'telefonoCelular' | 'email'
>>

export interface HistorialCliente {
  idHistorial: number
  tipoOperacion: string
  campoModificado: string
  valorAnterior: string | null
  modificadoPor: number
  direccionIP: string
  fechaModificacion: string
  observaciones: string
}

interface Pagina<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export interface FiltrosClientes {
  q: string
  identificacion: string
  tipoCliente: string
  estado: string
  sort: string
}

const base = '/api/v1/clientes'
export const clientesQueryKey = ['gestion-clientes'] as const
export const listaClientesKey = [...clientesQueryKey, 'lista'] as const
export const detalleClienteKey = (id: number) => [...clientesQueryKey, 'detalle', id] as const
export const historialClienteKey = (id: number) => [...clientesQueryKey, 'historial', id] as const

export async function buscarClientes(filtros: FiltrosClientes, page: number, signal: AbortSignal) {
  const { q, identificacion, tipoCliente, estado, sort } = filtros
  return (await apiClient.get<Pagina<Cliente>>(base, {
    signal,
    params: {
      q: q.trim() || undefined,
      identificacion: identificacion.trim() || undefined,
      tipoCliente: tipoCliente || undefined,
      estado: estado || undefined,
      sort: sort || undefined,
      page,
    },
  })).data
}

export async function obtenerCliente(id: number, signal: AbortSignal) {
  return (await apiClient.get<Cliente>(`${base}/${id}`, { signal })).data
}

export async function editarCliente(id: number, cambios: ClienteUpdate) {
  return (await apiClient.patch<Cliente>(`${base}/${id}`, cambios)).data
}

export async function cambiarEstadoCliente(id: number, estado: EstadoDestino, motivo: string) {
  return (await apiClient.patch<Cliente>(`${base}/${id}/estado`, { estado, motivo })).data
}

export async function obtenerHistorial(id: number, page: number, signal: AbortSignal) {
  return (await apiClient.get<Pagina<HistorialCliente>>(`${base}/${id}/historial`, {
    signal, params: { page },
  })).data
}
