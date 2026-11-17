import { create } from 'zustand'

import type { MeResponse } from '@/features/auth/api/auth.contract'
import { getAccessProfile, type AccessProfile } from '@/features/auth/lib/access'

export type AuthStatus = 'restoring' | 'authenticated' | 'anonymous'

/**
 * Solo datos para pintar la UI. No hay tokens en el navegador: la sesión vive en la cookie
 * httpOnly que gestiona el backend, y la fuente de verdad siempre es GET /api/v1/auth/me.
 */
interface AuthState {
  status: AuthStatus
  user: MeResponse | null
  setSession: (me: MeResponse) => void
  clearSession: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: 'restoring',
  user: null,
  setSession: (me) => set({ status: 'authenticated', user: me }),
  clearSession: () => set({ status: 'anonymous', user: null }),
}))

export const useAuthStatus = () => useAuthStore((state) => state.status)

/** Permisos de escritura del usuario (arreglo estable del store; vacío sin sesión) */
const SIN_PERMISOS: readonly string[] = []
export const usePermisos = (): readonly string[] => useAuthStore((state) => state.user?.permisos ?? SIN_PERMISOS)

/** Perfil de acceso del usuario autenticado (null mientras no hay sesión) */
export const useAccessProfile = (): AccessProfile | null =>
  useAuthStore((state) => (state.user ? getAccessProfile(state.user.roles) : null))
