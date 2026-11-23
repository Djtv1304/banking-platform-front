import { describe, expect, it } from 'vitest'

import {
  centavosDeTexto,
  dolaresDeCentavos,
  formatearCentavos,
  formatearDolares,
  MONTO_MAX_ENTEROS,
  soloCaracteresDeMonto,
} from '@/shared/lib/monto'

describe('centavosDeTexto', () => {
  it.each([
    ['1.234,56', 123456],
    ['1234,56', 123456],
    ['1234,5', 123450],
    ['1234', 123400],
    ['0,01', 1],
    [',50', 50],
    ['12.50', 1250],
    ['12.5', 1250],
    ['12.', 1200],
    ['1.234', 123400],
    ['1.234.567', 123456700],
    ['1.234.567,89', 123456789],
    ['$ 1.234,50', 123450],
    [' 15 ', 1500],
    ['0', 0],
    ['007,10', 710],
  ])('«%s» → %i centavos', (texto, esperado) => {
    expect(centavosDeTexto(texto)).toBe(esperado)
  })

  it.each([
    [''],
    ['   '],
    ['abc'],
    ['-5'],
    ['1,234,56'],
    ['1,234,5'],
    ['12,345'],
    ['1.23.4'],
    ['12.34.56'],
    ['1234.567'],
    ['1.2345,00'],
    ['12,3a'],
    [','],
    ['.'],
    ['1e5'],
  ])('«%s» no es un monto', texto => {
    expect(centavosDeTexto(texto)).toBeNull()
  })

  it(`admite hasta ${MONTO_MAX_ENTEROS} dígitos enteros (los ceros a la izquierda no cuentan)`, () => {
    expect(centavosDeTexto('9'.repeat(MONTO_MAX_ENTEROS) + ',99')).toBe(Number('9'.repeat(MONTO_MAX_ENTEROS + 2)))
    expect(centavosDeTexto('0' + '9'.repeat(MONTO_MAX_ENTEROS))).not.toBeNull()
    expect(centavosDeTexto('1' + '0'.repeat(MONTO_MAX_ENTEROS))).toBeNull()
  })

  it('el máximo entra en un entero seguro de JavaScript', () => {
    expect(Number.isSafeInteger(centavosDeTexto('9'.repeat(MONTO_MAX_ENTEROS) + ',99'))).toBe(true)
  })
})

describe('formato es-EC', () => {
  it('formatearCentavos deja coma decimal y punto de miles, siempre con dos decimales', () => {
    expect(formatearCentavos(123456789)).toBe('1.234.567,89')
    expect(formatearCentavos(1250)).toBe('12,50')
    expect(formatearCentavos(0)).toBe('0,00')
  })

  it('formatearDolares antepone el símbolo', () => {
    expect(formatearDolares(123450)).toBe('$1.234,50')
  })

  it('lo formateado se vuelve a leer igual (ida y vuelta)', () => {
    for (const centavos of [1, 99, 100, 123456, 100000000, 999999999999]) {
      expect(centavosDeTexto(formatearCentavos(centavos))).toBe(centavos)
    }
  })

  it('dolaresDeCentavos no arrastra error de coma flotante', () => {
    expect(dolaresDeCentavos(10) + dolaresDeCentavos(20)).toBeCloseTo(0.3, 10)
    expect(JSON.stringify(dolaresDeCentavos(123456))).toBe('1234.56')
  })
})

describe('soloCaracteresDeMonto', () => {
  it('quita letras, espacios, signos y el símbolo', () => {
    expect(soloCaracteresDeMonto('$ -1.234,5a0')).toBe('1.234,50')
  })
})
