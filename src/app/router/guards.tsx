import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { funcionesDeRuta } from '@/app/router/funciones-ruta'
import { actualizarAccesosPorActividad } from '@/features/auth/session'

import { Aviso } from '@/shared/ui'
import { canAccess, hasAnyRole, hasPermission, obtenerContextoAgencias, permiteSeccion, rutaLoginConRetorno, sanitizeReturnTo, useAccessProfile, useAuthStatus, useAuthStore, usePermisos, type AccessProfile, type Permiso } from '@/features/auth'

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
  const accesos = useAuthStore((state) => state.user?.accesosSecciones)
  const { pathname, search } = useLocation()
  const autorizacion = useAuthStore((s) => s.user?.autorizacion)
  useEffect(() => { void actualizarAccesosPorActividad() }, [pathname])

  if (status === 'restoring') return <SessionRestoring />
  if (status === 'anonymous') {
    return <Navigate to={rutaLoginConRetorno(pathname, search)} replace />
  }
  if (!autorizacion && !permiteSeccion(pathname, accesos)) {
    return pathname.replace(/\/$/, '').toLowerCase() === '/organizacion/agencias'
      ? <div className="mx-auto max-w-6xl p-6"><Aviso tono="error">No tienes permiso para administrar agencias.</Aviso></div>
      : <Navigate to="/" replace />
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
  const autorizacion = useAuthStore((s) => s.user?.autorizacion)
  const { pathname } = useLocation()
  const funciones = funcionesDeRuta(pathname)
  if (autorizacion?.activa && funciones) return funciones.some((f) => autorizacion.funciones.includes(f)) ? <Outlet /> : <Navigate to="/" replace />

  if (!profile || !canAccess(profile, allowed)) return <Navigate to="/" replace />
  return <Outlet />
}

export function RequireMatriz() {
  const contexto = useQuery({ queryKey: ['auth', 'agencias'], queryFn: ({ signal }) => obtenerContextoAgencias(signal), retry: false })
  if (contexto.isPending) return <div aria-busy="true" />
  return contexto.data?.agenciaEsMatriz
    ? <Outlet />
    : <Aviso tono="error">Selecciona la agencia matriz para acceder a esta sección.</Aviso>
}

/** Dentro de RequireAuth: la URL directa respeta los mismos roles que el menú. */
export function RequireRoles({ allowed, sinAcceso, permisoAlternativo }: { allowed: readonly string[]; sinAcceso?: ReactNode; permisoAlternativo?: Permiso }) {
  const roles = useAuthStore((state) => state.user?.roles)
  const permisos = usePermisos()
  const autorizacion = useAuthStore((s) => s.user?.autorizacion)
  const { pathname } = useLocation()
  const funciones = funcionesDeRuta(pathname)
  if (autorizacion?.activa && funciones) return funciones.some((f) => autorizacion.funciones.includes(f)) ? <Outlet /> : <Navigate to="/" replace />
  if (!hasAnyRole(roles ?? [], allowed) && (!permisoAlternativo || !hasPermission(permisos, permisoAlternativo))) return sinAcceso ?? <Navigate to="/" replace />
  return <Outlet />
}

/** Pantallas que solo sirven para escribir (registrar, abrir, solicitar): exigen el permiso. */
export function RequirePermiso({ permiso }: { permiso: Permiso }) {
  const permisos = usePermisos()
  const autorizacion = useAuthStore((s) => s.user?.autorizacion)
  const { pathname } = useLocation()
  const funciones = funcionesDeRuta(pathname)
  if (autorizacion?.activa && funciones) return funciones.some((f) => autorizacion.funciones.includes(f)) ? <Outlet /> : <Navigate to="/" replace />
  if (!hasPermission(permisos, permiso)) return <Navigate to="/" replace />
  return <Outlet />
}
