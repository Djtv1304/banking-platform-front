import { describe, expect, it, vi } from 'vitest'
vi.mock('@/shared/theme', () => ({ useThemeStore: vi.fn() }))
import { getRoleNavigation, getVisibleSections } from '@/app/navigation/navigation'
import { getAccessProfile } from '@/features/auth'
import { ROLES_USUARIO } from '@/features/usuarios'

const opciones = (rol: string) => getRoleNavigation(rol).flatMap((s) => s.opciones.map((o) => o.titulo))

describe('vista de roles y menú comparten la configuración', () => {
  it.each(ROLES_USUARIO)('%s muestra exactamente las opciones del menú, sin mantener otra matriz', (rol) => {
    const menu = getVisibleSections(getAccessProfile([rol]), [rol]).flatMap((s) => s.items.map((i) => i.label))
    expect(opciones(rol)).toEqual(menu)
  })
  it('solo ADMIN ve Usuarios y Roles y accesos', () => {
    expect(opciones('ADMIN')).toEqual(expect.arrayContaining(['Usuarios del sistema', 'Roles y accesos']))
    for (const rol of ROLES_USUARIO.filter((r) => r !== 'ADMIN')) {
      expect(opciones(rol)).not.toContain('Usuarios del sistema')
      expect(opciones(rol)).not.toContain('Roles y accesos')
    }
  })
  it('conserva contabilidad y no presenta roles desconocidos como roles del sistema', () => {
    expect(opciones('CONTADOR')).toEqual(expect.arrayContaining(['Plan de cuentas', 'Asientos contables']))
    expect(opciones('NO_EXISTE')).toEqual([])
  })
})
