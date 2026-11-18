import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RolesAccesosPage } from '@/features/seguridad/pages/RolesAccesosPage'

vi.mock('@/shared/theme', () => ({ useThemeStore: vi.fn() }))
vi.mock('@/features/seguridad/components/CatalogoPermisos', () => ({ CatalogoPermisos: () => <p>catalogo-permisos</p> }))
vi.mock('@/features/seguridad/components/AsignacionPermisos', () => ({ AsignacionPermisos: () => <p>asignacion-permisos</p> }))
vi.mock('@/features/seguridad/hooks/useConfiguracionAccesos', () => ({
  useConfiguracionAccesos: () => ({ data: { pestanas: [{ pestana: '/clientes-busqueda', roles: ['ADMIN'] }] }, isPending: false, refetch: vi.fn() }),
}))

const estado = vi.hoisted(() => ({ roles: ['ADMIN'] as string[] }))
vi.mock('@/features/auth', async (original) => ({
  ...(await original<typeof import('@/features/auth')>()),
  useAuthStore: (selector: (s: { user: { roles: string[] } }) => unknown) => selector({ user: { roles: estado.roles } }),
}))
const seccionesParaRol = vi.fn(() => [{ titulo: 'Clientes', opciones: [{ titulo: 'Consultar clientes', enPreparacion: false }] }])
const html = (roles = ['ADMIN', 'ASESOR']) => renderToStaticMarkup(
  <MemoryRouter><RolesAccesosPage roles={roles} seccionesParaRol={seccionesParaRol} /></MemoryRouter>,
)
beforeEach(() => { estado.roles = ['ADMIN']; seccionesParaRol.mockClear() })

describe('Roles y accesos de consulta', () => {
  it('muestra el rol elegido y el bloque Permisos con Catálogo y Asignación', () => {
    const salida = html()
    expect(salida).toContain('Roles y accesos')
    expect(salida).toContain('Consultar clientes')
    expect(salida).toContain('/usuarios?rol=ADMIN')
    expect(salida).toContain('aria-pressed="true"')
    expect(salida).not.toContain('org-admin') // el bloque de roles muestra solo el nombre
    expect(salida).toContain('>Permisos</h2>')
    expect(salida).toContain('Catálogo')
    expect(salida).toContain('Asignación')
    // Por defecto se ve el detalle del rol; catálogo y asignación se abren desde su bloque
    expect(salida).not.toContain('catalogo-permisos')
    expect(salida).not.toContain('asignacion-permisos')
    expect(seccionesParaRol).toHaveBeenCalledWith('ADMIN', { '/clientes-busqueda': ['ADMIN'] })
  })
  it.each(['SUPERVISOR', 'ASESOR', 'AUDITOR', 'DESCONOCIDO'])('no muestra el catálogo a %s', (rol) => {
    estado.roles = [rol]
    expect(html()).toContain('Solo un administrador')
    expect(seccionesParaRol).not.toHaveBeenCalled()
  })
  it('explica el estado vacío sin un enlace de gestión incompleto', () => {
    const salida = html([])
    expect(salida).toContain('No hay roles disponibles')
    expect(salida).not.toContain('/usuarios?rol=')
  })
})
