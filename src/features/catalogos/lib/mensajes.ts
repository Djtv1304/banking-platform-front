import type { ApiError } from '@/shared/api'

const MENSAJES: Record<string, string> = {
  REGISTRO_DUPLICADO: 'Ya existe otro registro con ese nombre o código.',
  REGISTRO_NO_ENCONTRADO: 'El registro ya no existe. Recarga la lista.',
  CATALOGO_NO_EXISTE: 'Ese catálogo no existe.',
  DATOS_INVALIDOS: 'Revisa los datos: hay valores que no son válidos.',
  CODIGO_DUPLICADO: 'Ya existe un registro con ese código o nombre.',
  ITEM_EN_USO: 'El registro se usa en otros datos: no se elimina. Desactívalo para que deje de ofrecerse.',
  ALTA_NO_PERMITIDA: 'Este catálogo no admite altas desde aquí.',
  BAJA_NO_PERMITIDA: 'Este catálogo no admite eliminar: desactiva el registro.',
  CONFIRMACION_REQUERIDA: 'Este cambio requiere el código de confirmación.',
  CONFIRMACION_INVALIDA: 'El código no coincide o venció. Pide uno nuevo e inténtalo otra vez.',
  ORIGEN_NO_PERMITIDO: 'La solicitud no llegó por el canal autorizado. Recarga la página e inténtalo otra vez.',
  USUARIO_INTERNO_NO_VINCULADO: 'Tu usuario no está habilitado para esta operación. Pide al administrador que lo vincule.',
  REFERENCIA_INVALIDA: 'Hay un dato que apunta a un registro que no existe (por ejemplo, el país).',
}

export function mensajeErrorCatalogo(error: ApiError) {
  if (error.code === 'SIN_PERMISO') return 'Solo un administrador puede cambiar los catálogos.'
  // DATOS_INVALIDOS del backend ya dice qué campo falla
  if (error.code === 'DATOS_INVALIDOS' && error.message) return error.message
  return MENSAJES[error.code] ?? error.message
}
