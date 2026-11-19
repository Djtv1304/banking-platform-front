import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkOSAvanzadoPage } from '@/features/seguridad/pages/WorkOSAvanzadoPage'

vi.mock('@/shared/theme', () => ({ useThemeStore: vi.fn() }))
vi.mock('@/features/seguridad/components/CatalogoPermisos', () => ({ CatalogoPermisos: () => <p>catalogo-avanzado</p> }))
vi.mock('@/features/seguridad/components/AsignacionPermisos', () => ({ AsignacionPermisos: () => <p>asignacion-avanzada</p> }))
const estado = vi.hoisted(() => ({ roles: ['ADMIN'] as string[], activa: false }))
vi.mock('@/features/auth', async (original) => ({
  ...(await original<typeof import('@/features/auth')>()),
  useAuthStore: (selector: (s: { user: { roles: string[]; autorizacion?: { activa: true } } }) => unknown) => selector({ user: { roles: estado.roles, autorizacion: estado.activa ? { activa: true } : undefined } }),
}))
const html = (ruta = '/seguridad/workos') => renderToStaticMarkup(
  <MemoryRouter initialEntries={[ruta]}><WorkOSAvanzadoPage roles={['ADMIN', 'SUPERVISOR']} /></MemoryRouter>,
)
beforeEach(() => { estado.roles = ['ADMIN']; estado.activa = false })

describe('Administración avanzada de WorkOS', () => {
  it('explica la diferencia con el editor y abre únicamente el catálogo por defecto', () => {
    const salida = html()
    expect(salida).toContain('Administración avanzada')
    expect(salida).toContain('No crea una pantalla ni una operación')
    expect(salida).toContain('/seguridad/pestanas')
    expect(salida).toContain('catalogo-avanzado')
    expect(salida).not.toContain('asignacion-avanzada')
    expect(salida).toContain('control por funciones está desactivado')
  })
  it('explica la autoridad de las funciones cuando el control está activo', () => {
    estado.activa = true
    expect(html()).toContain('control por funciones está activo')
    expect(html()).not.toContain('todavía no sustituye esas reglas')
  })
  it('permite abrir asignación con enlace directo sin montar el catálogo', () => {
    const salida = html('/seguridad/workos?vista=asignacion')
    expect(salida).toContain('asignacion-avanzada')
    expect(salida).not.toContain('catalogo-avanzado')
  })
  it.each(['SUPERVISOR', 'ASESOR', 'AUDITOR', 'DESCONOCIDO'])('no monta herramientas para %s', (rol) => {
    estado.roles = [rol]
    const salida = html()
    expect(salida).toContain('Solo un administrador')
    expect(salida).not.toContain('catalogo-avanzado')
    expect(salida).not.toContain('asignacion-avanzada')
  })
})
