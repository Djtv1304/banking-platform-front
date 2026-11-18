import { create } from 'zustand'

import type { MeResponse, MotivoCierre } from '@/features/auth/api/auth.contract'
import { getAccessProfile, type AccessProfile } from '@/features/auth/lib/access'
import { accionesPermitidas, type Permiso } from '@/shared/lib'

export type AuthStatus = 'restoring' | 'authenticated' | 'anonymous'

/**
 * Solo datos para pintar la UI. No hay tokens en el navegador: la sesión vive en la cookie
 * httpOnly que gestiona el backend, y la fuente de verdad siempre es GET /api/v1/auth/me.
 */
interface AuthState {
  status: AuthStatus
  user: MeResponse | null
  /** Por qué terminó la sesión (lo muestra /login); null en un cierre normal o sin sesión previa */
  motivoCierre: MotivoCierre | null
  setSession: (me: MeResponse) => void
  clearSession: (motivo?: MotivoCierre | null) => void
  consumirMotivoCierre: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: 'restoring',
  user: null,
  motivoCierre: null,
  setSession: (me) => set({ status: 'authenticated', user: me, motivoCierre: null }),
  clearSession: (motivo = null) => set({ status: 'anonymous', user: null, motivoCierre: motivo }),
  consumirMotivoCierre: () => set({ motivoCierre: null }),
}))

export const useAuthStatus = () => useAuthStore((state) => state.status)

/** Escrituras que la UI muestra a este usuario: permiso de WorkOS (prd-, con-) o rol; ver shared/lib/permisos */
const SIN_PERMISOS: readonly Permiso[] = []
let cache: { user: MeResponse | null; acciones: readonly Permiso[] } = { user: null, acciones: SIN_PERMISOS }
function accionesDe(user: MeResponse | null): readonly Permiso[] {
  // Arreglo estable por sesión: el selector de zustand no debe devolver uno nuevo en cada render
  if (user !== cache.user) cache = { user, acciones: user ? accionesPermitidas(user.roles, user.permisos) : SIN_PERMISOS }
  return cache.acciones
}
export const usePermisos = (): readonly Permiso[] => useAuthStore((state) => accionesDe(state.user))

/** Perfil de acceso del usuario autenticado (null mientras no hay sesión) */
export const useAccessProfile = (): AccessProfile | null =>
  useAuthStore((state) => (state.user ? getAccessProfile(state.user.roles) : null))
