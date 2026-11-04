import { apiClient } from '@/shared/api'
import { env } from '@/shared/config'
import { AUTH_ENDPOINTS, type LogoutResponse, type MeResponse } from '@/features/auth/api/auth.contract'

/**
 * URL para iniciar sesión. Se usa como `href` (navegación completa): el backend responde con un 302
 * hacia el dominio de WorkOS, algo que un fetch/XHR no puede seguir.
 */
export function buildLoginUrl(returnTo?: string) {
  const query = returnTo && returnTo !== '/' ? `?${new URLSearchParams({ return_to: returnTo })}` : ''
  return `${env.apiUrl}${AUTH_ENDPOINTS.login}${query}`
}

/** Usuario de la sesión actual (la cookie viaja sola gracias a `withCredentials`) */
export async function getMe() {
  const { data } = await apiClient.get<MeResponse>(AUTH_ENDPOINTS.me)
  return data
}

export async function logout() {
  const { data } = await apiClient.post<LogoutResponse>(AUTH_ENDPOINTS.logout)
  return data
}
