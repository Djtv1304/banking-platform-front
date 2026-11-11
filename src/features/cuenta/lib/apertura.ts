import type { ApiError } from '@/shared/api'

/* Mensajes de la apertura de cuenta (CTA-01) por `code` de ProblemDetails, sin UI para probarlos aparte */

const SIN_PERMISO = 'No tienes permiso para abrir cuentas.'

const MENSAJES: Record<string, string> = {
  CLIENTE_NO_ACTIVO: 'El cliente no está activo: no se le puede abrir una cuenta.',
  RIESGO_RECHAZADO: 'El cliente tiene una evaluación de riesgo vigente rechazada: no se le puede abrir una cuenta.',
  PRODUCTO_NO_ES_CUENTA: 'El producto elegido ya no está disponible para abrir cuentas. Elige otro.',
  MONTO_APERTURA_INSUFICIENTE: 'El depósito inicial no cubre el mínimo de apertura del producto.',
  AGENCIA_INACTIVA: 'La agencia elegida no existe o no está activa. Elige otra.',
  DATOS_INVALIDOS: 'Revisa los datos de la apertura: hay valores que no son válidos.',
}

/** Campo del formulario al que apunta cada error de negocio (para marcarlo y llevar el foco) */
const CAMPOS = {
  PRODUCTO_NO_ES_CUENTA: 'idSubProducto',
  MONTO_APERTURA_INSUFICIENTE: 'montoInicial',
  AGENCIA_INACTIVA: 'idAgencia',
} as const

export type CampoApertura = (typeof CAMPOS)[keyof typeof CAMPOS]

export function mensajeErrorApertura(error: ApiError) {
  if (error.status === 403) return SIN_PERMISO
  return MENSAJES[error.code] ?? error.message
}

/** `null` si el error no es de un campo concreto (cliente, riesgo, permiso, red…) */
export function campoErrorApertura(error: ApiError): CampoApertura | null {
  return CAMPOS[error.code as keyof typeof CAMPOS] ?? null
}
