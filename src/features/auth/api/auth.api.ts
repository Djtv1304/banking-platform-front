import { ApiError, apiClient } from '@/shared/api'
import { AUTH_ENDPOINTS, meResponseSchema, type LogoutResponse } from '@/features/auth/api/auth.contract'

/**
 * URL para iniciar sesión. Se usa como `href` (navegación completa): el backend responde con un 302
 * hacia el dominio de WorkOS, algo que un fetch/XHR no puede seguir.
 */
export function buildLoginUrl(returnTo?: string) {
  const query = returnTo && returnTo !== '/' ? `?${new URLSearchParams({ return_to: returnTo })}` : ''
  return `${AUTH_ENDPOINTS.login}${query}`
}

/**
 * Usuario de la sesión actual (la cookie viaja sola gracias a `withCredentials`).
 * Si la respuesta no tiene la forma esperada (p. ej. HTML porque el backend no está conectado),
 * se rechaza y la sesión queda anónima en lugar de romper la app.
 */
export async function getMe() {
  const { data, status } = await apiClient.get<unknown>(AUTH_ENDPOINTS.me)
  const result = meResponseSchema.safeParse(data)
  if (!result.success) {
    throw new ApiError('No pudimos verificar tu sesión. Inténtalo más tarde.', status, 'respuesta_invalida')
  }
  return result.data
}

export async function logout() {
  const { data } = await apiClient.post<LogoutResponse>(AUTH_ENDPOINTS.logout)
  return data
}
