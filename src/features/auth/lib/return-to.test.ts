import { describe, expect, it } from 'vitest'

import { sanitizeReturnTo } from '@/features/auth/lib/return-to'

describe('sanitizeReturnTo', () => {
  it('acepta rutas internas con su query', () => {
    expect(sanitizeReturnTo('/clientes')).toBe('/clientes')
    expect(sanitizeReturnTo('/clientes?q=ana&page=2')).toBe('/clientes?q=ana&page=2')
  })

  it('rechaza redirecciones abiertas a otros sitios', () => {
    expect(sanitizeReturnTo('https://sitio-malicioso.com')).toBeUndefined()
    expect(sanitizeReturnTo('//sitio-malicioso.com')).toBeUndefined()
    expect(sanitizeReturnTo('/\\sitio-malicioso.com')).toBeUndefined()
    expect(sanitizeReturnTo('clientes')).toBeUndefined()
  })

  it('no devuelve al login para evitar bucles', () => {
    expect(sanitizeReturnTo('/login')).toBeUndefined()
    expect(sanitizeReturnTo('/login?error=LOGIN_CANCELADO')).toBeUndefined()
  })

  it('trata vacío y nulos como sin destino', () => {
    expect(sanitizeReturnTo('')).toBeUndefined()
    expect(sanitizeReturnTo(null)).toBeUndefined()
    expect(sanitizeReturnTo(undefined)).toBeUndefined()
  })
})
