import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { AsignacionPermisos } from '@/features/seguridad/components/AsignacionPermisos'

vi.mock('@/shared/theme', () => ({ useThemeStore: vi.fn() }))
vi.mock('@/features/seguridad/components/PermisosRolPanel', () => ({
  PermisosRolPanel: ({ rol }: { rol: string }) => <p>permisos-de-{rol}</p>,
}))

describe('AsignacionPermisos', () => {
  it('permite elegir el rol y muestra sus permisos (el primero por defecto)', () => {
    const html = renderToStaticMarkup(<AsignacionPermisos roles={['CONTADOR', 'CAJERO']} />)
    expect(html).toContain('Asignación de permisos')
    expect(html).toContain('id="asignacion-rol"')
    expect(html).toContain('permisos-de-CONTADOR')
  })
})

describe('AsignacionPermisos sin datos internos', () => {
  it('el selector muestra solo el nombre del rol', () => {
    expect(renderToStaticMarkup(<AsignacionPermisos roles={['SUPERVISOR']} />)).not.toContain('org-')
  })
})
