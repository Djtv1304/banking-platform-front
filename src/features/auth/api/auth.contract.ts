import { z } from 'zod'

/*
 * Contrato con el backend (FastAPI, patrón BFF) para AuthKit de WorkOS.
 *
 * El navegador NUNCA habla con la API de WorkOS ni ve tokens: FastAPI genera la URL de autorización,
 * recibe el callback, sella la sesión y la guarda en la cookie httpOnly `__Host-session`.
 * También renueva el token por su cuenta (en /me y en cualquier ruta protegida), así que la SPA
 * solo navega a /login, consulta /me y llama a /logout.
 *
 * Duración e inactividad las impone WorkOS (8 h y 15 min). Cualquier petición renueva la sesión,
 * así que la SPA no hace peticiones en segundo plano: solo las que provoca el usuario.
 * Una sola sesión abierta por usuario (otro dispositivo → /login?error=SESION_ABIERTA).
 */

/** Tiempo de inactividad configurado en WorkOS (PCI DSS 8.2.8) */
export const INACTIVIDAD_SESION_MS = 15 * 60_000
/** Duración del access token en WorkOS: lo que puede tardar la cookie en reflejar una renovación */
export const DURACION_ACCESS_TOKEN_MS = 5 * 60_000

/**
 * Rutas del backend, siempre relativas (mismo origen que la SPA): en desarrollo las reenvía el proxy
 * de Vite (vite.config.ts) y en producción el Worker de Cloudflare (worker/index.ts).
 */
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
  /** GET · 200 → MeResponse · 401 → sin sesión (motivo en `code`). Si el token venció, lo renueva y reescribe la cookie. */
  me: '/api/v1/auth/me',
  /** POST · Fuerza la renovación y responde 204 (o 401 con el motivo). Lo usa «Seguir conectado». */
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
  accesosSecciones: z.object({
    version: z.string().regex(/^[a-f0-9]{64}$/),
    habilitadas: z.array(z.string()),
  }).optional(),
  autorizacion: z.object({
    version: z.string().regex(/^[a-f0-9]{64}$/), activa: z.literal(true),
    funciones: z.array(z.string()), rutas: z.array(z.string()),
  }).optional(),
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
  | 'USUARIO_NO_HABILITADO'
  /** El usuario ya tiene una sesión abierta en otro dispositivo; esa sesión sigue */
  | 'SESION_ABIERTA'

/**
 * `code` de un 401 de cualquier endpoint. La cookie ya viene borrada: no hace falta llamar a /logout.
 * NO_AUTENTICADO es un login normal (sin aviso); los demás explican por qué terminó la sesión.
 */
export type MotivoSesion = 'NO_AUTENTICADO' | 'SESION_EXPIRADA' | 'SESION_INACTIVA' | 'SESION_REVOCADA'

/** Motivos que se explican en /login */
export type MotivoCierre = Exclude<MotivoSesion, 'NO_AUTENTICADO'>

const MOTIVOS_CIERRE: readonly string[] = ['SESION_EXPIRADA', 'SESION_INACTIVA', 'SESION_REVOCADA'] satisfies MotivoCierre[]

export function esMotivoCierre(code: unknown): code is MotivoCierre {
  return typeof code === 'string' && MOTIVOS_CIERRE.includes(code)
}


export const agenciaAsignadaSchema = z.object({ idAgencia: z.string(), codigo: z.string(), estado: z.string(), principal: z.boolean().optional().default(false) })
export const contextoAgenciasSchema = z.object({ idAgencia: z.string().nullable(), agenciaEsMatriz: z.boolean().default(false), idAgenciaPrincipal: z.string().nullable(), agenciasAsignadas: z.array(agenciaAsignadaSchema), agenciasPermitidas: z.array(agenciaAsignadaSchema), requiereSeleccionAgencia: z.boolean(), alcanceGlobal: z.boolean().optional().default(false), accesoTodasAgencias: z.boolean().optional().default(false) })
