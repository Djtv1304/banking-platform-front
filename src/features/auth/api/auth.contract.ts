import { z } from 'zod'

/*
 * Contrato con el backend (FastAPI, patrón BFF) para AuthKit de WorkOS.
 *
 * El navegador NUNCA habla con la API de WorkOS ni ve tokens: FastAPI genera la URL de autorización,
 * recibe el callback, sella la sesión y la guarda en la cookie httpOnly `__Host-session`.
 * También renueva el token por su cuenta (en /me y en cualquier ruta protegida), así que la SPA
 * solo navega a /login, consulta /me y llama a /logout.
 */

/** Rutas del backend. Son relativas a `env.apiUrl` (vacío = mismo origen, ver proxy en vite.config.ts). */
export const AUTH_ENDPOINTS = {
  /**
   * GET · Navegación completa (no fetch). Guarda `state` y `return_to` en la cookie `__Host-oauth_state`
   * (10 min) y redirige (302) al Hosted UI de AuthKit. También es el "Initiate login URI" de WorkOS.
   * Query opcional: `return_to` (ruta interna; un valor externo como `//evil.com` se reemplaza por `/`).
   */
  login: '/api/v1/auth/login',
  /**
   * GET · Lo llama WorkOS, nunca la SPA. Es el "Redirect URI" de WorkOS.
   * Éxito → 302 a `return_to` con la cookie de sesión. Error → 302 a `/login?error=<LoginErrorCode>`.
   */
  callback: '/api/v1/auth/callback',
  /** GET · 200 → MeResponse · 401 → sin sesión. Si el token venció, lo renueva y reescribe la cookie. */
  me: '/api/v1/auth/me',
  /** POST · Opcional: fuerza la renovación y responde 204. La SPA no lo necesita. */
  refresh: '/api/v1/auth/refresh',
  /** POST · Borra la cookie y devuelve LogoutResponse. Es idempotente. */
  logout: '/api/v1/auth/logout',
} as const

/**
 * GET /api/v1/auth/me · 200 OK
 *
 * Se valida en tiempo de ejecución porque un 200 no garantiza JSON: si `/api` no llega al backend
 * (p. ej. en un hosting estático con fallback de SPA), el servidor responde `index.html` con 200.
 */
export const meResponseSchema = z.object({
  /** ID de WorkOS (`user_...`) */
  idUsuario: z.string(),
  nombre: z.string(),
  email: z.string(),
  idOrganizacion: z.string().nullable(),
  roles: z.array(z.string()),
  permisos: z.array(z.string()),
  idAgencia: z.string().nullable(),
})

export type MeResponse = z.infer<typeof meResponseSchema>

/** POST /api/v1/auth/logout · 200 OK */
export interface LogoutResponse {
  /** URL de cierre de sesión de WorkOS; al terminar devuelve al "Sign-out URI" configurado */
  logoutUrl: string
}

/** Valores de `?error=` con los que el callback devuelve al usuario a /login */
export type LoginErrorCode =
  | 'LOGIN_CANCELADO'
  | 'SOLICITUD_INVALIDA'
  | 'CREDENCIALES_INVALIDAS'
  | 'AUTENTICACION_NO_DISPONIBLE'
