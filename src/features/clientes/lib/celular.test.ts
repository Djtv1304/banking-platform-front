import { describe, expect, it } from 'vitest'

import { CELULAR_PREFIJO, formatearCelular, normalizarCelular } from '@/features/clientes/lib/celular'

describe('normalizarCelular', () => {
  it('quita el 0 inicial del formato local', () => {
    expect(normalizarCelular('0991234567')).toBe('991234567')
  })

  it('quita el prefijo internacional y todo lo que no es dígito', () => {
    expect(normalizarCelular('+593 99 123 4567')).toBe('991234567')
    expect(normalizarCelular('(593) 99-123-4567')).toBe('991234567')
  })

  it('conserva los dígitos adicionales para que el formulario pueda rechazarlos', () => {
    expect(normalizarCelular('099123456789')).toBe('99123456789')
    expect(normalizarCelular('+593 99 123 456789')).toBe('99123456789')
  })

  it('devuelve vacío si no hay dígitos', () => {
    expect(normalizarCelular('abc')).toBe('')
  })
})

describe('formatearCelular', () => {
  it('no oculta los dígitos que exceden la longitud válida', () => {
    expect(formatearCelular('99123456789')).toBe('99 123 456789')
  })
  it('agrupa los 9 dígitos como 99 123 4567', () => {
    expect(formatearCelular('991234567')).toBe('99 123 4567')
  })

  it('formatea mientras se escribe, sin espacios sobrantes', () => {
    expect(formatearCelular('99')).toBe('99')
    expect(formatearCelular('9912')).toBe('99 12')
    expect(formatearCelular('')).toBe('')
  })
})

describe('CELULAR_PREFIJO', () => {
  it('es el código de Ecuador en E.164', () => {
    expect(CELULAR_PREFIJO).toBe('+593')
  })
})
