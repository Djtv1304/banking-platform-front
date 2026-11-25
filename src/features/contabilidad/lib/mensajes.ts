import type { ApiError } from '@/shared/api'

/* Mensajes de error del plan de cuentas por `code` (ProblemDetails, F-04) */

export const MENSAJE_NO_DISPONIBLE = 'Esta acción todavía no está disponible en el servidor.'

/** Confirmación tras una operación: 202 = quedó pendiente de aprobación, aún no se aplica */
export const mensajeResultado = (pendiente: boolean, hecho: string) =>
  pendiente ? 'Solicitud enviada a aprobación: el cambio se verá en el plan cuando la aprueben.' : hecho

const MENSAJES: Record<string, string> = {
  CODIGO_NO_CORRESPONDE_AL_PADRE: 'El código debe empezar por el de la cuenta superior y tener 8 dígitos.',
  CODIGO_DUPLICADO: 'Ya existe una cuenta con ese código.',
  CUENTA_SUPERIOR_CON_MOVIMIENTOS: 'La cuenta superior ya tiene movimientos o saldo: no se le pueden crear subcuentas.',
  CUENTA_SUPERIOR_NO_ENCONTRADA: 'La cuenta superior ya no existe. Recarga el plan de cuentas.',
  DB_51100: 'La cuenta superior recibe movimientos y no admite subcuentas.',
  CUENTA_CON_SALDO: 'La cuenta tiene saldo distinto de cero: no se puede desactivar ni eliminar.',
  CUENTA_EN_USO: 'La cuenta tiene movimientos o se usa en la configuración contable: no se puede eliminar. Desactívala si ya no debe usarse.',
  CUENTA_CONTABLE_NO_ENCONTRADA: 'La cuenta ya no existe. Recarga el plan de cuentas.',
  CUENTA_NO_ENCONTRADA: 'La cuenta ya no existe. Recarga el plan de cuentas.',
  CUENTA_DEL_REGULADOR: 'Esta cuenta es del catálogo del regulador: su nombre solo cambia con una importación del catálogo.',
}

/** Códigos con los que el backend dice que la función existe pero aún no tiene lógica */
const CODIGOS_NO_DISPONIBLE = new Set(['FUNCION_NO_DISPONIBLE', 'OPERACION_NO_HABILITADA'])

/**
 * Mientras el backend no tenga el endpoint, responde 501, o 404/405 genéricos (code HTTP_404,
 * HTTP_405 o http_404 si no llega ProblemDetails). También avisa con 404 FUNCION_NO_DISPONIBLE
 * (p. ej. la baja de cuentas) o 501 OPERACION_NO_HABILITADA. Un 404 con otro code propio (la
 * cuenta no existe) sí es un error de verdad.
 */
export const esNoDisponible = (error: ApiError) =>
  error.status === 501 ||
  CODIGOS_NO_DISPONIBLE.has(error.code) ||
  ((error.status === 404 || error.status === 405) && /^http_\d+$/i.test(error.code))

export function mensajeErrorPlanCuentas(error: ApiError, operacion: 'consulta' | 'mantenimiento') {
  if (esNoDisponible(error)) return MENSAJE_NO_DISPONIBLE
  if (error.status === 403) {
    return operacion === 'consulta'
      ? 'Tu rol no tiene acceso al plan de cuentas.'
      : 'Solo un contador puede cambiar el plan de cuentas.'
  }
  return MENSAJES[error.code] ?? error.message
}

/** Campos de los formularios de cuenta que pueden recibir un error del backend */
export type CampoCuenta = 'codigoCuenta' | 'nombreCuenta'

/**
 * Errores que van junto a un campo: los `errors[]` de un 400 DATOS_INVALIDOS (el backend los nombra
 * en camelCase, a veces con `body.` delante) y los códigos de negocio que hablan de un campo.
 */
export function erroresDeCampo(error: ApiError, campos: readonly CampoCuenta[]) {
  const resultado = new Map<CampoCuenta, string>()
  for (const { field, message } of error.fields) {
    const campo = field.replace(/^body\./, '') as CampoCuenta
    if (campos.includes(campo) && !resultado.has(campo)) resultado.set(campo, message)
  }
  if ((error.code === 'CODIGO_NO_CORRESPONDE_AL_PADRE' || error.code === 'CODIGO_DUPLICADO') && campos.includes('codigoCuenta')) {
    resultado.set('codigoCuenta', MENSAJES[error.code])
  }
  return resultado
}
