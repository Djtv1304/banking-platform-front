import { describe, expect, it } from 'vitest'

import { canAccess, getAccessProfile } from '@/features/auth/lib/access'

describe('getAccessProfile', () => {
  it('reconoce al admin sin importar mayúsculas ni espacios (el backend manda ADMIN)', () => {
    expect(getAccessProfile(['ADMIN'])).toBe('admin')
    expect(getAccessProfile([' admin '])).toBe('admin')
  })

  it('gana el perfil de mayor alcance cuando hay varios roles', () => {
    expect(getAccessProfile(['CAJERO', 'ADMIN'])).toBe('admin')
    expect(getAccessProfile(['cliente', 'ASESOR'])).toBe('staff')
  })

  it('cualquier rol del personal es staff', () => {
    for (const rol of ['ASESOR', 'CAJERO', 'SUPERVISOR', 'CONTADOR', 'AUDITOR', 'APROBADOR_CREDITO']) {
      expect(getAccessProfile([rol])).toBe('staff')
    }
  })

  it('sin roles o sólo con cliente es cliente (el perfil con menos opciones)', () => {
    expect(getAccessProfile([])).toBe('cliente')
    expect(getAccessProfile(['cliente'])).toBe('cliente')
  })
})

describe('canAccess', () => {
  it('sin restricción todos acceden', () => {
    expect(canAccess('cliente')).toBe(true)
    expect(canAccess('staff', [])).toBe(true)
  })

  it('sólo los perfiles permitidos acceden', () => {
    expect(canAccess('staff', ['staff'])).toBe(true)
    expect(canAccess('cliente', ['staff'])).toBe(false)
  })

  it('el admin siempre accede', () => {
    expect(canAccess('admin', ['staff'])).toBe(true)
    expect(canAccess('admin', ['cliente'])).toBe(true)
  })
})
