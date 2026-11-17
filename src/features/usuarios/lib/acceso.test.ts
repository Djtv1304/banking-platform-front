import { describe, expect, it } from 'vitest'

import { hasAnyRole } from '@/features/auth/lib/access'
import { accesoUsuarios, ROLES_GESTION_USUARIOS } from '@/features/usuarios/lib/acceso'

describe('regla compartida para menú, rutas y pantalla de Usuarios', () => {
  it.each(['ADMIN', ' admin '])('%s puede consultar', (rol) => {
    expect(hasAnyRole([rol], ROLES_GESTION_USUARIOS)).toBe(true)
    expect(accesoUsuarios([rol]).consulta).toBe(true)
  })

  it.each(['SUPERVISOR', ' supervisor ', 'ASESOR', 'CAJERO', 'AUDITOR', 'CONTADOR', 'APROBADOR_CREDITO', 'CLIENTE', 'DESCONOCIDO'])('%s no puede consultar', (rol) => {
    expect(hasAnyRole([rol], ROLES_GESTION_USUARIOS)).toBe(false)
    expect(accesoUsuarios([rol]).consulta).toBe(false)
    expect(accesoUsuarios([rol]).creacion).toBe(false)
  })

  it('crear y cambiar usuarios depende de usuarios:editar', () => {
    expect(accesoUsuarios(['ADMIN']).creacion).toBe(false)
    expect(accesoUsuarios(['ADMIN'], ['usuarios:editar']).creacion).toBe(true)
  })

  it('recalcula el acceso al sustituir roles y admite varios roles', () => {
    expect(accesoUsuarios(['ADMIN']).consulta).toBe(true)
    expect(accesoUsuarios(['ASESOR']).consulta).toBe(false)
    expect(accesoUsuarios(['ASESOR', 'SUPERVISOR']).consulta).toBe(false)
    expect(accesoUsuarios(['ASESOR', 'ADMIN']).consulta).toBe(true)
    expect(accesoUsuarios([]).consulta).toBe(false)
  })
})
