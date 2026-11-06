import axios from 'axios'

import { toApiError } from '@/shared/api/errors'

/**
 * `shared` no conoce la feature de autenticación: ella registra aquí qué hacer cuando la API
 * responde 401 (ver `registerAuthHandlers` en features/auth).
 */
let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
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
  (error) => {
    // No hay refresh en el cliente: el backend renueva la sesión sellada por su cuenta.
    // Si aun así responde 401, la sesión terminó.
    if (error.response?.status === 401) onUnauthorized?.()
    return Promise.reject(toApiError(error))
  },
)
