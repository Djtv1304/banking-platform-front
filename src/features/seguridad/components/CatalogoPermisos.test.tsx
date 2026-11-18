import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { CatalogoPermisos } from '@/features/seguridad/components/CatalogoPermisos'
import { nuevoPermisoSchema } from '@/features/seguridad/api/seguridad.contract'

vi.mock('@/shared/theme', () => ({ useThemeStore: vi.fn() }))
vi.mock('@/features/seguridad/hooks/useSeguridad', () => ({
  usePermisosWorkOS: () => ({
    data: [
      { slug: 'prd-consultar', nombre: 'Consultar productos', descripcion: 'Ver el catálogo', sistema: false },
      { slug: 'widgets:users-table:manage', nombre: 'Manage users', descripcion: null, sistema: true },
    ],
    error: null,
    isPending: false,
  }),
  useCrearPermiso: () => ({ isPending: false, error: null, mutate: vi.fn() }),
  useBorrarPermiso: () => ({ isPending: false, error: null, mutate: vi.fn() }),
  useEditarPermiso: () => ({ isPending: false, error: null, mutate: vi.fn() }),
}))

describe('CatalogoPermisos', () => {
  it('ofrece crear permisos y lista los propios para editarlos o borrarlos, sin los de sistema', () => {
    const html = renderToStaticMarkup(<CatalogoPermisos />)
    expect(html).toContain('Crear permiso')
    expect(html).toContain('Borrar prd-consultar')
    expect(html).toContain('Editar prd-consultar')
    expect(html).not.toContain('Manage users')
  })

  it.each([
    ['prd-aprobar', true],
    ['con-cerrar-periodo', true],
    ['PRD-aprobar', false],
    ['productos:editar', false],
    ['prdaprobar', false],
  ])('valida el código %s como permiso general', (slug, valido) => {
    expect(nuevoPermisoSchema.safeParse({ slug, nombre: 'X' }).success).toBe(valido)
  })
})
