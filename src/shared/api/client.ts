import axios from 'axios'

import { toApiError, type ApiError } from '@/shared/api/errors'

/**
 * `shared` no conoce la feature de autenticación: ella registra aquí qué hacer cuando la API
 * responde 401 (ver `registerAuthHandlers` en features/auth).
 */
let onUnauthorized: ((error: ApiError) => void) | null = null
let onForbidden: ((url?: string) => Promise<void>) | null = null

export function setUnauthorizedHandler(handler: (error: ApiError) => void) {
  onUnauthorized = handler
}

export function setForbiddenHandler(handler: (url?: string) => Promise<void>) {
  onForbidden = handler
}

/**
 * Sin `baseURL`: todas las rutas son relativas (`/api/v1/...`) y van al mismo origen de la SPA.
 * En desarrollo las reenvía el proxy de Vite y en producción el Worker de Cloudflare (worker/index.ts),
 * así que la cookie httpOnly `__Host-session` viaja sola, sin CORS ni credenciales cross-origin.
 */
export const apiClient = axios.create({
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const apiError = toApiError(error)
    // No hay refresh en el cliente: el backend renueva la sesión sellada por su cuenta.
    // Si aun así responde 401, la sesión terminó; el motivo viene en `code`.
    if (apiError.status === 401) onUnauthorized?.(apiError)
    // Releer el acceso no repite la petición que falló (podría ser una escritura).
    if (apiError.status === 403) await onForbidden?.(error.config?.url)
    return Promise.reject(apiError)
  },
)
