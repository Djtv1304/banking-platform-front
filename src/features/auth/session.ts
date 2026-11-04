import { setUnauthorizedHandler } from '@/shared/api'
import { getMe, logout } from '@/features/auth/api/auth.api'
import { useAuthStore } from '@/features/auth/store/auth.store'

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
  window.location.assign(logoutUrl ?? '/login')
}

/**
 * Conecta el cliente HTTP de `shared/api` con esta feature: cualquier 401 de la API significa que
 * la sesión ya no es válida (el backend renueva la sesión sellada por su cuenta mientras pueda).
 */
export function registerAuthHandlers() {
  setUnauthorizedHandler(() => useAuthStore.getState().clearSession())
}
