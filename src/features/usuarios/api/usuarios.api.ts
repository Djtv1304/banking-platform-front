import { aceptadaSchema, ApiError, apiClient, toApiError } from '@/shared/api'
import {
  crearUsuarioSchema,
  paginaUsuariosSchema,
  cambiarRolSchema,
  edicionUsuarioSchema,
  usuarioCreadoSchema,
  usuarioDetalleSchema,
  USUARIOS_ENDPOINTS,
  type CrearUsuario,
  type EdicionUsuario,
  type RolUsuario,
} from '@/features/usuarios/api/usuarios.contract'

const DETALLE_INVALIDO = 'No pudimos leer los datos del usuario. Inténtalo más tarde.'

/** Valida que la respuesta sea el detalle del usuario pedido (y no, p. ej., index.html) */
function leerDetalle(data: unknown, status: number, idUsuario: number) {
  const result = usuarioDetalleSchema.safeParse(data)
  if (status !== 200 || !result.success || result.data.idUsuario !== idUsuario) {
    throw new ApiError(DETALLE_INVALIDO, status, 'respuesta_invalida')
  }
  return result.data
}

/** AUT-07 · Usuario inexistente → 404 */
export async function obtenerUsuario(idUsuario: number, signal?: AbortSignal) {
  const { data, status } = await apiClient.get<unknown>(USUARIOS_ENDPOINTS.detalle(idUsuario), { signal })
  return leerDetalle(data, status, idUsuario)
}

/** AUT-08 · Un solo tipo de cambio por llamada: datos, agencia o estado */
export async function editarUsuario(idUsuario: number, cambios: EdicionUsuario) {
  const body = edicionUsuarioSchema.parse(cambios)
  const { data, status } = await apiClient.patch<unknown>(USUARIOS_ENDPOINTS.detalle(idUsuario), body)
  return leerDetalle(data, status, idUsuario)
}

export async function trasladarUsuario(idUsuario: number, idAgencia: string) {
  const body = edicionUsuarioSchema.parse({ idAgencia })
  const { data, status } = await apiClient.put<unknown>(USUARIOS_ENDPOINTS.agencia(idUsuario), body)
  return leerDetalle(data, status, idUsuario)
}

/** AUT-09 · Reemplaza el rol; el backend rechaza quitar el último ADMIN */
export async function cambiarRolUsuario(idUsuario: number, roles: RolUsuario[]) {
  const body = cambiarRolSchema.parse({ roles })
  const { data, status } = await apiClient.put<unknown>(USUARIOS_ENDPOINTS.roles(idUsuario), body)
  if (status === 202) {
    const solicitud = aceptadaSchema.safeParse(data)
    if (!solicitud.success) throw new ApiError(DETALLE_INVALIDO, status, 'respuesta_invalida')
    return { tipo: 'solicitud' as const, solicitud: solicitud.data }
  }
  return { tipo: 'aplicado' as const, usuario: leerDetalle(data, status, idUsuario) }
}

/** AUT-05 · `params` ya viene sin filtros vacíos (ver `armarParametros`) */
export async function listarUsuarios(params: Record<string, string>, signal?: AbortSignal) {
  const { data, status } = await apiClient.get<unknown>(USUARIOS_ENDPOINTS.listar, { params, signal })
  const result = paginaUsuariosSchema.safeParse(data)
  // Un 200 no garantiza JSON: si /api no llega al backend el hosting puede responder index.html
  if (!result.success) {
    throw new ApiError('No pudimos leer la lista de usuarios. Inténtalo más tarde.', status, 'respuesta_invalida')
  }
  return result.data
}

/** AUT-06 · Nunca se reintenta: una respuesta perdida no prueba que el usuario no se haya creado */
export async function crearUsuario(usuario: CrearUsuario) {
  const body = crearUsuarioSchema.parse(usuario)
  const { data, status } = await apiClient.post<unknown>(USUARIOS_ENDPOINTS.crear, body)
  const result = usuarioCreadoSchema.safeParse(data)
  if (status !== 201 || !result.success || result.data.username.toLowerCase() !== body.username.toLowerCase()) {
    throw new ApiError(
      'No pudimos confirmar la creación. Busca el usuario en el listado antes de volver a intentarlo.',
      status,
      'creacion_sin_confirmar',
    )
  }
  return result.data
}

/** Mensaje general de un error de AUT-05 */
export function mensajeErrorListado(error: unknown) {
  const e = toApiError(error)
  if (e.status === 403) return 'No tienes permiso para consultar los usuarios. Se requiere el rol ADMIN.'
  if (e.status === 429) return 'Hiciste demasiadas consultas seguidas. Espera un momento y vuelve a intentarlo.'
  if (e.status === 503) return 'El servicio de accesos no está disponible en este momento. Inténtalo en unos minutos.'
  return e.message
}

/** Mensaje general de un error de AUT-06; los errores por campo se muestran junto a cada campo */
export function mensajeErrorCreacion(error: unknown) {
  const e = toApiError(error)
  if (e.status === 403) return 'No tienes permiso para crear usuarios. Se requiere el rol ADMIN.'
  if (e.status === 429) return 'Hiciste demasiados intentos seguidos. Espera un momento y vuelve a intentarlo.'
  if (e.code === 'POLITICA_ROLES_NO_CONFIGURADA' || e.code === 'OPERACION_NO_CONFIGURADA') return mensajeErrorCambio(e)
  if (e.status === 503) {
    return 'El servicio de invitaciones (WorkOS) no está disponible. Revisa el listado antes de reintentar; tus datos siguen en el formulario.'
  }
  if (e.status === null || e.status >= 500) {
    return 'No pudimos confirmar si el usuario se creó. Búscalo en el listado antes de volver a intentarlo; tus datos siguen en el formulario.'
  }
  if (e.status === 422 && e.fields.length > 0) return 'Revisa los campos marcados.'
  return e.message
}

/** Mensaje de un error de AUT-07 al abrir el detalle */
export function mensajeErrorDetalle(error: unknown) {
  const e = toApiError(error)
  if (e.status === 404) return 'No existe un usuario con ese ID. Puede que el enlace esté incompleto.'
  return mensajeErrorListado(error)
}

/**
 * Mensaje de un error de AUT-08 o AUT-09. Si no hubo respuesta clara (5xx, red, WorkOS caído) no se
 * sabe si el cambio quedó guardado: la ficha se vuelve a pedir para mostrar el estado real.
 */
export function mensajeErrorCambio(error: unknown) {
  const e = toApiError(error)
  if (Object.hasOwn(mensajesCambio, e.code)) return mensajesCambio[e.code]
  if (e.code === 'AUTOGESTION_NO_PERMITIDA') return e.message
  if (e.status === 403) return 'No tienes permiso para cambiar este usuario. Se requiere el rol ADMIN.'
  if (e.status === 404) return 'Este usuario ya no existe. Vuelve al listado.'
  if (e.status === 429) return 'Hiciste demasiados cambios seguidos. Espera un momento y vuelve a intentarlo.'
  if (cambioSinConfirmar(e)) return 'Consulta el estado del cambio antes de volver a guardar.'
  if (e.status === 422 && e.fields.length > 0) return 'Revisa los campos marcados.'
  // 409 (p. ej. el último ADMIN o un correo ya usado) y 400 traen un detalle legible del backend
  return e.message
}

const mensajesCambio: Record<string, string> = {
  SIN_PERMISO: 'No tienes permiso para ejecutar este cambio.',
  APROBADOR_ES_SOLICITANTE: 'La solicitud debe resolverla otro aprobador autorizado.',
  USUARIO_CON_JORNADA_ABIERTA: 'El usuario tiene una jornada abierta.',
  CAJERO_CON_JORNADA_ABIERTA: 'El cajero debe cerrar su jornada antes del cambio.',
  ULTIMO_ADMIN: 'Debe quedar al menos un administrador.',
  USUARIO_EN_CONCILIACION: 'Hay una conciliaci\u00f3n pendiente para este usuario.',
  ASIGNACIONES_CAJA_OCUPADAS: 'Las asignaciones de caja cambiaron o est\u00e1n ocupadas. Consulta las asignaciones vigentes.',
  APROBACION_REQUERIDA: 'El cambio requiere que otro usuario autorizado lo apruebe.',
  CORTE_CAJA_PENDIENTE: 'El cambio requiere completar el corte de asignaciones de caja.',
  USUARIO_PENDIENTE_DE_VINCULO: 'La cuenta debe completar su v\u00ednculo antes del cambio.',
  NIVEL_INSUFICIENTE: 'Tu nivel de autorizaci\u00f3n es insuficiente para estos roles.',
  ROLES_INCOMPATIBLES: 'La pol\u00edtica institucional impide combinar los roles seleccionados.',
  CORREO_REQUIERE_CAMBIO_SEPARADO: 'Guarda el correo en una solicitud separada.',
  POLITICA_ROLES_NO_CONFIGURADA: 'La pol\u00edtica institucional de roles no est\u00e1 configurada.',
  OPERACION_NO_CONFIGURADA: 'La operaci\u00f3n a\u00fan no est\u00e1 configurada.',
  CORREO_EN_CONCILIACION: 'El correo est\u00e1 en conciliaci\u00f3n.',
  ROLES_PENDIENTES_CONFIRMACION: 'Los roles est\u00e1n pendientes de confirmaci\u00f3n.',
  WORKOS_NO_DISPONIBLE: 'El servicio de accesos no est\u00e1 disponible.',
}

/** Una escritura incierta requiere consultar el estado antes de habilitar otro intento. */
export function cambioSinConfirmar(error: unknown) {
  const { status, code } = toApiError(error)
  if (code === 'POLITICA_ROLES_NO_CONFIGURADA' || code === 'OPERACION_NO_CONFIGURADA') return false
  return status === null || status >= 500 || code === 'respuesta_invalida' ||
    code === 'USUARIO_EN_CONCILIACION' || code === 'ASIGNACIONES_CAJA_OCUPADAS'
}
