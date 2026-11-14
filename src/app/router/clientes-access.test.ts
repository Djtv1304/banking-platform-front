import { describe, expect, it } from 'vitest'

import { CLIENTES_ROLES, hasAnyRole } from '@/features/auth/lib/access'

describe('acceso a Clientes compartido por menú y rutas', () => {
  it.each([
    ['ADMIN', true, true],
    ['ASESOR', true, true],
    ['CAJERO', false, true],
    ['SUPERVISOR', false, true],
    ['CONTADOR', false, false],
    ['AUDITOR', false, false],
    ['APROBADOR_CREDITO', false, false],
    ['CLIENTE', false, false],
    ['ROL_DESCONOCIDO', false, false],
  ])('%s: registrar=%s, consultar=%s', (role, registrar, consultar) => {
    expect(hasAnyRole([role], CLIENTES_ROLES.registrar)).toBe(registrar)
    expect(hasAnyRole([role], CLIENTES_ROLES.consultar)).toBe(consultar)
  })

  it('sin roles no permite ninguna de las dos operaciones', () => {
    expect(hasAnyRole([], CLIENTES_ROLES.registrar)).toBe(false)
    expect(hasAnyRole([], CLIENTES_ROLES.consultar)).toBe(false)
  })

  it('normaliza mayúsculas y espacios y acepta cualquiera de los roles asignados', () => {
    expect(hasAnyRole(['CONTADOR', ' asesor '], CLIENTES_ROLES.registrar)).toBe(true)
    expect(hasAnyRole(['cliente', ' cajero '], CLIENTES_ROLES.consultar)).toBe(true)
    expect(hasAnyRole(['SUPERVISOR', 'admin'], CLIENTES_ROLES.registrar)).toBe(true)
  })
})
