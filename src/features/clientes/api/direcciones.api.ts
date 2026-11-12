import { ApiError, apiClient } from '@/shared/api'
import {
  DIRECCIONES_ENDPOINTS, direccionCambioSchema, direccionGestionSchema, direccionNuevaSchema,
  type DireccionCambio, type DireccionNueva,
} from '@/features/clientes/api/direcciones.contract'

function validarRespuesta(data: unknown) {
  const result = direccionGestionSchema.safeParse(data)
  if (!result.success) throw new ApiError('No pudimos leer la dirección devuelta por el servidor.', 502, 'respuesta_invalida')
  return result.data
}

export async function listarDirecciones(idCliente: number, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>(DIRECCIONES_ENDPOINTS.lista(idCliente), { signal })
  const result = direccionGestionSchema.array().safeParse(data)
  if (!result.success) throw new ApiError('No pudimos leer las direcciones del servidor.', 502, 'respuesta_invalida')
  return result.data
}

export async function agregarDireccion(idCliente: number, body: DireccionNueva) {
  const { data } = await apiClient.post<unknown>(DIRECCIONES_ENDPOINTS.lista(idCliente), direccionNuevaSchema.parse(body))
  return validarRespuesta(data)
}

export async function editarDireccion(idCliente: number, idDireccion: number, body: DireccionCambio) {
  const { data } = await apiClient.patch<unknown>(DIRECCIONES_ENDPOINTS.detalle(idCliente, idDireccion), direccionCambioSchema.parse(body))
  return validarRespuesta(data)
}

export async function darBajaDireccion(idCliente: number, idDireccion: number) {
  await apiClient.delete(DIRECCIONES_ENDPOINTS.detalle(idCliente, idDireccion))
}
