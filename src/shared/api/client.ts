import axios from 'axios'

import { env } from '@/shared/config'
import { toApiError } from './errors'

/**
 * `shared` no conoce la feature de autenticación: ella registra aquí qué hacer cuando la API
 * responde 401 (ver `registerAuthHandlers` en features/auth).
 */
let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

export const apiClient = axios.create({
  // Vacío = mismo origen que la SPA (en desarrollo, Vite hace de proxy de /api hacia FastAPI)
  baseURL: env.apiUrl,
  // Envía la cookie httpOnly de sesión (__Host-session) que emite el backend
  withCredentials: true,
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
