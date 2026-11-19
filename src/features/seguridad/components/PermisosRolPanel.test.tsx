import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PermisosRolPanel } from '@/features/seguridad/components/PermisosRolPanel'

vi.mock('@/shared/theme', () => ({ useThemeStore: vi.fn() }))
const estado = vi.hoisted(() => ({ error: null as Error | null }))
vi.mock('@/features/seguridad/hooks/useSeguridad', () => ({
  usePermisosWorkOS: () => ({
    data: [
      { slug: 'prd-consultar', nombre: 'Consultar productos', descripcion: null, sistema: false },
      { slug: 'con-cuenta-editar', nombre: 'Editar cuentas', descripcion: 'Importaciones', sistema: false },
      { slug: 'widgets:users-table:manage', nombre: 'Manage users', descripcion: null, sistema: true },
    ],
    error: estado.error,
    isPending: false,
  }),
  useRolesPermisos: () => ({
    data: [{ rol: 'CONTADOR', slug: 'org-contador', nombre: 'Contador', descripcion: null, permisos: ['con-cuenta-editar'] }],
    error: null,
    isPending: false,
  }),
  useCambiarPermisoRol: () => ({ isPending: false, variables: undefined, error: null, mutate: vi.fn() }),
}))
beforeEach(() => {
  estado.error = null
})

describe('PermisosRolPanel', () => {
  it('marca los permisos del rol y no ofrece los de sistema', () => {
    const html = renderToStaticMarkup(<PermisosRolPanel rol="CONTADOR" />)
    expect(html).toContain('Consultar productos')
    expect(html).toContain('con-cuenta-editar')
    expect(html).not.toContain('Manage users')
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1)
  })

  it('muestra el error de WorkOS', () => {
    estado.error = new Error('El servicio de usuarios no está disponible.')
    expect(renderToStaticMarkup(<PermisosRolPanel rol="CONTADOR" />)).toContain('no está disponible')
  })
})
