import { describe, expect, it } from 'vitest'
import { errorMotivoAcceso } from '@/features/seguridad/lib/motivo-acceso'

describe('explicación de la validación del motivo', () => {
  it('explica el caso observado Tests V2 y cuántos caracteres faltan', () => {
    expect(errorMotivoAcceso('Tests V2')).toBe('El motivo necesita al menos 10 caracteres. Faltan 2 caracteres.')
  })
  it('distingue uno pendiente y no cuenta espacios al principio o al final', () => {
    expect(errorMotivoAcceso('123456789')).toContain('Falta 1 carácter.')
    expect(errorMotivoAcceso('  Tests V2  ')).toContain('Faltan 2 caracteres.')
    expect(errorMotivoAcceso('   ')).toContain('Faltan 10 caracteres.')
  })
  it('acepta desde diez hasta ciento sesenta y rechaza longitud excesiva', () => {
    expect(errorMotivoAcceso('1234567890')).toBeNull()
    expect(errorMotivoAcceso('a'.repeat(160))).toBeNull()
    expect(errorMotivoAcceso('a'.repeat(161))).toContain('máximo 160')
  })
  it('no confunde pares UTF-16 con caracteres completos del backend', () => {
    expect(errorMotivoAcceso('😀'.repeat(5))).toContain('Faltan 5 caracteres.')
  })
  it('explica por qué un motivo con saltos de línea no es válido', () => {
    expect(errorMotivoAcceso('Prueba local\ncon otra línea')).toContain('una sola línea')
  })
})
