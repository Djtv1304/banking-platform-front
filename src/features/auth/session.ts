import type { QueryClient } from '@tanstack/react-query'
import { setUnauthorizedHandler, setForbiddenHandler, toApiError } from '@/shared/api'
import { getMe, logout } from '@/features/auth/api/auth.api'
import { AUTH_ENDPOINTS, type MeResponse } from '@/features/auth/api/auth.contract'
import { useAuthStore } from '@/features/auth/store/auth.store'

let sessionCache: Pick<QueryClient, 'clear'> | null = null
let pending: { user: MeResponse; promise: Promise<void> } | null = null

function compareAccessValues(a: string, b: string) {
  if (a === b) return 0
  return a < b ? -1 : 1
}

function accessKey(user: MeResponse) {
  const roles = [...new Set(user.roles.map((role) => role.trim().toUpperCase()))].sort(compareAccessValues)
  const permissions = [...new Set(user.permisos)].sort(compareAccessValues)
  return JSON.stringify([
    user.idUsuario,
    user.idOrganizacion,
    user.idAgencia,
    roles,
    permissions,
  ])
}

/** Actualiza la UI desde /me; no cambia roles ni fuerza una renovación en WorkOS. */
export function refreshSession(): Promise<void> {
  const previous = useAuthStore.getState().user
  if (!previous) return Promise.resolve()
  if (pending?.user === previous) return pending.promise

  const promise = (async () => {
    try {
      const current = await getMe()
      // Un logout o una sesión nueva prevalecen sobre una respuesta antigua.
      if (useAuthStore.getState().user !== previous) return
      if (accessKey(previous) !== accessKey(current)) sessionCache?.clear()
      useAuthStore.getState().setSession(current)
    } catch (error) {
      if (useAuthStore.getState().user !== previous) return
      const { status } = toApiError(error)
      if (status === 401 || status === 403) {
        useAuthStore.getState().clearSession()
        sessionCache?.clear()
      }
      // Una caída temporal no significa que la sesión haya terminado.
    }
  })()
  pending = { user: previous, promise }
  void promise.finally(() => {
    if (pending?.promise === promise) pending = null
  })
  return promise
}

/** Sincronización visual: foco, pestaña visible y cada minuto mientras se usa la app. */
export function startSessionSync() {
  const sync = () => {
    if (document.visibilityState === 'visible') void refreshSession()
  }
  window.addEventListener('focus', sync)
  document.addEventListener('visibilitychange', sync)
  const timer = setInterval(sync, 60_000)
  return () => {
    window.removeEventListener('focus', sync)
    document.removeEventListener('visibilitychange', sync)
    clearInterval(timer)
  }
}

/**
 * Al cargar la app pregunta al backend quién es el usuario.
 *
 * Así es como la SPA "se entera" de que el login terminó: el callback de FastAPI acaba con un 302
 * hacia la SPA, lo que es una carga completa de la página, y esta función se ejecuta en cada carga.
 * Si la cookie es válida → 200 y queda autenticado; si no → 401 y queda anónimo.
 */
export async function restoreSession() {
  try {
    useAuthStore.getState().setSession(await getMe())
  } catch {
    // 401 (sin sesión) o error de red/servidor: se trata como anónimo y el guard lleva a /login
    useAuthStore.getState().clearSession()
  }
}

/**
 * Cierra la sesión en el backend (borra la cookie) y en WorkOS (navegando a su logout URL,
 * que luego devuelve al usuario al "Sign-out URI" configurado).
 */
export async function signOut() {
  let logoutUrl: string | null = null
  try {
    ;({ logoutUrl } = await logout())
  } catch {
    // Aunque el backend falle, se limpia el estado local
  }
  useAuthStore.getState().clearSession()
  window.location.href = logoutUrl ?? '/login'
}

/**
 * Conecta el cliente HTTP de `shared/api` con esta feature: cualquier 401 de la API significa que
 * la sesión ya no es válida (el backend renueva la sesión sellada por su cuenta mientras pueda).
 * Además de olvidar al usuario, vacía la caché de consultas para que los datos de clientes, cuentas
 * o tarjetas que ya se habían cargado no sigan en memoria ni se muestren a quien entre después.
 */
export function registerAuthHandlers(queryClient: Pick<QueryClient, 'clear'>) {
  sessionCache = queryClient
  setUnauthorizedHandler(() => {
    useAuthStore.getState().clearSession()
    queryClient.clear()
  })
  setForbiddenHandler(async (url) => {
    // /me también puede rechazar un usuario desactivado: no volver a llamarse a sí mismo.
    if (url !== AUTH_ENDPOINTS.me) await refreshSession()
  })
}
