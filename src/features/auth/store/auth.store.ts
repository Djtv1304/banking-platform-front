import { create } from 'zustand'

import type { MeResponse } from '../api/auth.contract'

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
