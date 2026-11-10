import { describe, expect, it } from 'vitest'

import { formatRol, formatRoles } from '@/features/auth/lib/roles'

describe('formatRol', () => {
  it('traduce cada rol conocido del backend', () => {
    expect(formatRol('ADMIN')).toBe('Administrador')
    expect(formatRol('ASESOR')).toBe('Asesor')
    expect(formatRol('CAJERO')).toBe('Cajero')
    expect(formatRol('SUPERVISOR')).toBe('Supervisor')
    expect(formatRol('APROBADOR_CREDITO')).toBe('Aprobador de crédito')
    expect(formatRol('CONTADOR')).toBe('Contador')
    expect(formatRol('AUDITOR')).toBe('Auditor')
  })

  it('ignora mayúsculas, espacios y guiones', () => {
    expect(formatRol(' admin ')).toBe('Administrador')
    expect(formatRol('aprobador-credito')).toBe('Aprobador de crédito')
  })

  it('un rol desconocido se muestra en palabras', () => {
    expect(formatRol('ORG_ASESOR')).toBe('Org asesor')
    expect(formatRol('GERENTE')).toBe('Gerente')
  })
})

describe('formatRoles', () => {
  it('une los roles con coma', () => {
    expect(formatRoles(['CAJERO', 'ASESOR'])).toBe('Cajero, Asesor')
  })

  it('sin roles dice «Sin rol asignado»', () => {
    expect(formatRoles([])).toBe('Sin rol asignado')
  })

  it('no repite roles', () => {
    expect(formatRoles(['CAJERO', 'cajero', ' CAJERO '])).toBe('Cajero')
  })
})
