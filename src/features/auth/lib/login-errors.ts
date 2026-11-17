import type { LoginErrorCode, MotivoCierre } from '@/features/auth/api/auth.contract'

export interface AvisoLogin {
  mensaje: string
  /** Aclaración opcional bajo el mensaje */
  nota?: string
}

const LOGIN_ERROR_MESSAGES: Record<LoginErrorCode, AvisoLogin> = {
  LOGIN_CANCELADO: { mensaje: 'Cancelaste el inicio de sesión. Puedes intentarlo nuevamente cuando quieras.' },
  SOLICITUD_INVALIDA: { mensaje: 'Tu solicitud de ingreso caducó o no es válida. Vuelve a iniciar sesión.' },
  CREDENCIALES_INVALIDAS: { mensaje: 'No pudimos verificar tus credenciales. Inténtalo nuevamente.' },
  AUTENTICACION_NO_DISPONIBLE: {
    mensaje: 'El servicio de acceso no está disponible en este momento. Inténtalo nuevamente en unos minutos.',
  },
  USUARIO_NO_HABILITADO: { mensaje: 'Tu usuario no está habilitado para ingresar. Contacta al administrador.' },
  SESION_ABIERTA: {
    mensaje:
      'Ya tienes una sesión abierta en otro dispositivo. Ciérrala allí para iniciar aquí. Si no la reconoces, contacta al administrador.',
    nota: 'Si cerraste el navegador sin cerrar sesión, podrás entrar en unos 15 minutos.',
  },
}

const FALLBACK: AvisoLogin = { mensaje: 'Ocurrió un problema al iniciar sesión. Inténtalo nuevamente.' }

/** Aviso para el `?error=` con el que el callback del backend devuelve al usuario a /login */
export function getLoginErrorMessage(code: string | null): AvisoLogin | null {
  if (!code) return null
  return LOGIN_ERROR_MESSAGES[code as LoginErrorCode] ?? FALLBACK
}

const MOTIVO_CIERRE_MESSAGES: Record<MotivoCierre, string> = {
  SESION_INACTIVA: 'Tu sesión se cerró por inactividad. Vuelve a iniciar sesión para continuar.',
  SESION_EXPIRADA: 'Tu sesión llegó al tiempo máximo permitido. Vuelve a iniciar sesión para continuar.',
  SESION_REVOCADA: 'Un administrador cerró tu sesión o cambió tus permisos. Vuelve a iniciar sesión para continuar.',
}

/** Por qué terminó la sesión (`code` del 401) */
export function getMotivoCierreMessage(motivo: MotivoCierre | null): AvisoLogin | null {
  return motivo ? { mensaje: MOTIVO_CIERRE_MESSAGES[motivo] } : null
}
