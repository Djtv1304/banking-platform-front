import { describe, expect, it } from 'vitest'

import { esquemaMotivo, minimoEfectivo } from '@/shared/lib/motivo'

const mensaje = (motivo: string, opciones: Parameters<typeof esquemaMotivo>[0]) => {
  const resultado = esquemaMotivo(opciones).safeParse({ motivo })
  return resultado.success ? null : resultado.error.issues[0].message
}

describe('esquemaMotivo', () => {
  it('obligatorio: rechaza vacío y sólo espacios', () => {
    expect(mensaje('', { obligatorio: true })).toBe('Escribe el motivo.')
    expect(mensaje('      ', { obligatorio: true })).toBe('Escribe el motivo.')
  })

  it('obligatorio: exige 10 caracteres por defecto, contados ya sin espacios sobrantes', () => {
    expect(mensaje('123456789', { obligatorio: true })).toBe('El motivo debe tener al menos 10 caracteres.')
    expect(mensaje('   123456789   ', { obligatorio: true })).toBe('El motivo debe tener al menos 10 caracteres.')
    expect(mensaje('1234567890', { obligatorio: true })).toBeNull()
  })

  it('devuelve el motivo recortado', () => {
    const resultado = esquemaMotivo({ obligatorio: true }).parse({ motivo: '  Cliente lo pidió por escrito  ' })
    expect(resultado.motivo).toBe('Cliente lo pidió por escrito')
  })

  it('respeta un mínimo y un máximo propios', () => {
    expect(mensaje('abcd', { obligatorio: true, minimo: 5 })).toBe('El motivo debe tener al menos 5 caracteres.')
    expect(mensaje('abcde', { obligatorio: true, minimo: 5 })).toBeNull()
    expect(mensaje('x'.repeat(21), { obligatorio: true, maximo: 20 })).toBe('Usa como máximo 20 caracteres.')
  })

  it('opcional: acepta vacío y sólo valida lo escrito', () => {
    expect(mensaje('', { obligatorio: false })).toBeNull()
    expect(mensaje('   ', { obligatorio: false, minimo: 10 })).toBeNull()
    expect(mensaje('corto', { obligatorio: false, minimo: 10 })).toBe('El motivo debe tener al menos 10 caracteres.')
    expect(mensaje('x'.repeat(501), { obligatorio: false })).toBe('Usa como máximo 500 caracteres.')
  })

  it('minimoEfectivo anuncia el mínimo sólo cuando se exige', () => {
    expect(minimoEfectivo({ obligatorio: true })).toBe(10)
    expect(minimoEfectivo({ obligatorio: true, minimo: 20 })).toBe(20)
    expect(minimoEfectivo({ obligatorio: false })).toBeNull()
    expect(minimoEfectivo({ obligatorio: false, minimo: 5 })).toBe(5)
  })
})
