import type { LoginErrorCode } from '../api/auth.contract'

const LOGIN_ERROR_MESSAGES: Record<LoginErrorCode, string> = {
  LOGIN_CANCELADO: 'Cancelaste el inicio de sesión. Puedes intentarlo nuevamente cuando quieras.',
  SOLICITUD_INVALIDA: 'Tu solicitud de ingreso caducó o no es válida. Vuelve a iniciar sesión.',
  CREDENCIALES_INVALIDAS: 'No pudimos verificar tus credenciales. Inténtalo nuevamente.',
  AUTENTICACION_NO_DISPONIBLE:
    'El servicio de acceso no está disponible en este momento. Inténtalo nuevamente en unos minutos.',
}

const FALLBACK_MESSAGE = 'Ocurrió un problema al iniciar sesión. Inténtalo nuevamente.'

/** Mensaje para el `?error=` con el que el callback del backend devuelve al usuario a /login */
export function getLoginErrorMessage(code: string | null): string | null {
  if (!code) return null
  return LOGIN_ERROR_MESSAGES[code as LoginErrorCode] ?? FALLBACK_MESSAGE
}
