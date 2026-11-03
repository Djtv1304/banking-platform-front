import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router'

import { canAccess, sanitizeReturnTo, useAccessProfile, useAuthStatus, type AccessProfile } from '@/features/auth'

// Pantalla vacía mientras GET /api/v1/auth/me responde
function SessionRestoring() {
  return <div className="min-h-svh bg-shell" aria-busy="true" />
}

/**
 * Rutas privadas: sin sesión redirige a /login?return_to=<ruta>. Va en la URL (no en el state del
 * router) porque el login sale de la SPA hacia WorkOS y el backend debe devolver al usuario ahí.
 */
export function RequireAuth() {
  const status = useAuthStatus()
  const { pathname, search } = useLocation()

  if (status === 'restoring') return <SessionRestoring />
  if (status === 'anonymous') {
    const returnTo = sanitizeReturnTo(`${pathname}${search}`)
    const query = returnTo && returnTo !== '/' ? `?${new URLSearchParams({ return_to: returnTo })}` : ''
    return <Navigate to={`/login${query}`} replace />
  }
  return <Outlet />
}

/** Rutas públicas (login): con sesión activa redirige al destino pendiente o al Home. */
export function GuestOnly() {
  const status = useAuthStatus()
  const [searchParams] = useSearchParams()

  if (status === 'restoring') return <SessionRestoring />
  if (status === 'authenticated') {
    return <Navigate to={sanitizeReturnTo(searchParams.get('return_to')) ?? '/'} replace />
  }
  return <Outlet />
}

/** Rutas restringidas por perfil (va dentro de RequireAuth): sin acceso redirige al Home. */
export function RequireProfile({ allowed }: { allowed: readonly AccessProfile[] }) {
  const profile = useAccessProfile()

  if (!profile || !canAccess(profile, allowed)) return <Navigate to="/" replace />
  return <Outlet />
}
