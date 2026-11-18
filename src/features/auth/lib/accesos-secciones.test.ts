import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Routes, Route } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { permiteSeccion } from '@/features/auth/lib/accesos-secciones'
import { getVisibleSections } from '@/app/navigation/navigation'
import { RequireAuth } from '@/app/router/guards'
import { useAuthStore } from '@/features/auth/store/auth.store'
import { StaffHome } from '@/features/dashboard/components/StaffHome'
import type { MeResponse } from '@/features/auth/api/auth.contract'
import { accionesPermitidas } from '@/shared/lib'

vi.mock('@/shared/theme', () => ({ useThemeStore: vi.fn() }))
vi.mock('@/features/auth', async (original) => ({
  ...(await original<typeof import('@/features/auth')>()),
  useAuthStore: (selector: (s: ReturnType<typeof useAuthStore.getState>) => unknown) => selector(useAuthStore.getState()),
  useAuthStatus: () => useAuthStore.getState().status,
  usePermisos: () => {
    const user = useAuthStore.getState().user
    return user ? accionesPermitidas(user.roles, user.permisos) : []
  },
}))
const accesos = { version: 'a'.repeat(64), habilitadas: ['/', '/cuentas'] }
const usuario: MeResponse = { idUsuario: 'local', nombre: 'Asesor local', email: 'local@example.invalid', roles: ['ASESOR'], permisos: [], idAgencia: '001', idOrganizacion: 'org_local', accesosSecciones: accesos }
afterEach(() => useAuthStore.getState().clearSession())

describe('Una política para menú, rutas y accesos rápidos', () => {
  it('distingue rutas anidadas y no abre Apertura porque Consulta esté habilitada', () => {
    expect(permiteSeccion('/cuentas/33/movimientos', accesos)).toBe(true)
    expect(permiteSeccion('/cuentas/abrir', accesos)).toBe(false)
    expect(permiteSeccion('/clientes-busqueda/33/direcciones', accesos)).toBe(false)
    expect(permiteSeccion('/clientes-busqueda', undefined)).toBe(true)
  })
  it('la configuración visual antigua no puede reabrir una sección retirada', () => {
    const menu = getVisibleSections('staff', ['ASESOR'], [], { '/clientes-busqueda': ['ASESOR'] }, accesos).flatMap((s) => s.items)
    expect(menu.some((p) => p.to === '/clientes-busqueda')).toBe(false)
    expect(menu.some((p) => p.to === '/cuentas')).toBe(true)
  })
  it('el guard de sesión impide abrir directamente la ficha', () => {
    useAuthStore.getState().setSession(usuario)
    const html = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ['/clientes-busqueda/33'] }, createElement(Routes, null, createElement(Route, { element: createElement(RequireAuth) }, createElement(Route, { path: '*', element: createElement('p', null, 'Ficha privada') })))) )
    expect(html).not.toContain('Ficha privada')
  })
  it('el guard permite la ruta cuando está habilitada en la política', () => {
    useAuthStore.getState().setSession({ ...usuario, accesosSecciones: { ...accesos, habilitadas: ['/clientes-busqueda'] } })
    const html = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ['/clientes-busqueda/33'] }, createElement(Routes, null, createElement(Route, { element: createElement(RequireAuth) }, createElement(Route, { path: '*', element: createElement('p', null, 'Ficha privada') })))) )
    expect(html).toContain('Ficha privada')
  })
  it('el acceso rápido desaparece y vuelve al restaurar la política', () => {
    const home = () => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(StaffHome)))
    useAuthStore.getState().setSession(usuario)
    expect(home()).not.toContain('href="/clientes-busqueda"')
    useAuthStore.getState().setSession({ ...usuario, accesosSecciones: { ...accesos, habilitadas: ['/', '/clientes-busqueda'] } })
    expect(home()).toContain('href="/clientes-busqueda"')
  })
  it('habilitar Agencias no elimina su restricción de rol', () => {
    const menu = getVisibleSections('staff', ['ASESOR'], [], undefined, { ...accesos, habilitadas: ['/organizacion/agencias'] }).flatMap((s) => s.items)
    expect(menu.some((p) => p.to === '/organizacion/agencias')).toBe(false)
  })
})
