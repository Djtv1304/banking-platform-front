import { describe, expect, it } from 'vitest'

import { CLIENTES_ROLES, hasAnyRole, hasPermission, PERMISOS } from '@/features/auth/lib/access'

describe('acceso a Clientes compartido por menú y rutas', () => {
  it.each([
    ['ADMIN', true],
    ['ASESOR', true],
    ['CAJERO', true],
    ['SUPERVISOR', true],
    ['CONTADOR', false],
    ['AUDITOR', false],
    ['APROBADOR_CREDITO', false],
    ['CLIENTE', false],
    ['ROL_DESCONOCIDO', false],
  ])('%s: consultar=%s (lo decide el rol)', (role, consultar) => {
    expect(hasAnyRole([role], CLIENTES_ROLES.consultar)).toBe(consultar)
  })

  it('normaliza mayúsculas y espacios y acepta cualquiera de los roles asignados', () => {
    expect(hasAnyRole(['cliente', ' cajero '], CLIENTES_ROLES.consultar)).toBe(true)
    expect(hasAnyRole([], CLIENTES_ROLES.consultar)).toBe(false)
  })

  it('registrar lo decide el permiso clientes:editar, no el rol', () => {
    expect(hasPermission(['clientesEditar'], PERMISOS.clientesEditar)).toBe(true)
    expect(hasPermission(['clientesEstado'], PERMISOS.clientesEditar)).toBe(false)
    expect(hasPermission([], PERMISOS.clientesEditar)).toBe(false)
  })
})
