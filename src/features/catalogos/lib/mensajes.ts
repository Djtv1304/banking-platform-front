import type { ApiError } from '@/shared/api'

const MENSAJES: Record<string, string> = {
  TASA_SOLAPADA: 'Ya hay una tasa activa de ese tipo de crédito para ese rango de monto en esas fechas. Ajusta el rango o la vigencia.',
  REGISTRO_DUPLICADO: 'Ya existe otro registro con ese nombre o código.',
  REGISTRO_NO_ENCONTRADO: 'El registro ya no existe. Recarga la lista.',
  CATALOGO_NO_EXISTE: 'Ese catálogo no existe.',
  DATOS_INVALIDOS: 'Revisa los datos: hay valores que no son válidos.',
}

export function mensajeErrorCatalogo(error: ApiError) {
  if (error.status === 403) return 'Solo un administrador puede cambiar los catálogos.'
  // DATOS_INVALIDOS del backend ya dice qué campo falla
  if (error.code === 'DATOS_INVALIDOS' && error.message) return error.message
  return MENSAJES[error.code] ?? error.message
}
