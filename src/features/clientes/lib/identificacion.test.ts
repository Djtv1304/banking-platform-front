import { describe, expect, it } from 'vitest'

import { esCedulaValida, esPasaporteValido, esRucValido } from '@/features/clientes/lib/identificacion'

// Números sintéticos: cumplen el dígito verificador pero no pertenecen a nadie
const CEDULA_VALIDA = '1712345675'
const CEDULA_PROVINCIA_30 = '3000000012'

describe('esPasaporteValido · formato del backend', () => {
  it.each(['A1234', 'AB12345678901', 'ab123456', '123456789'])('acepta %s', (valor) => expect(esPasaporteValido(valor)).toBe(true))
  it.each(['', 'A123', 'AB123456789012', 'AB 12345', 'AB-12345', 'ÁB12345'])('rechaza %j', (valor) => expect(esPasaporteValido(valor)).toBe(false))
})

describe('esCedulaValida', () => {
  it('acepta una cédula con provincia y dígito verificador correctos', () => {
    expect(esCedulaValida(CEDULA_VALIDA)).toBe(true)
    expect(esCedulaValida('0923456784')).toBe(true)
  })

  it('acepta el código 30 de ecuatorianos registrados en el exterior', () => {
    expect(esCedulaValida(CEDULA_PROVINCIA_30)).toBe(true)
  })

  it('rechaza un dígito verificador incorrecto', () => {
    expect(esCedulaValida('1712345670')).toBe(false)
  })

  it('rechaza provincias fuera de 01-24 y 30', () => {
    expect(esCedulaValida('2512345678')).toBe(false)
    expect(esCedulaValida('0012345678')).toBe(false)
  })

  it('rechaza un tercer dígito de 6 o más', () => {
    expect(esCedulaValida('1762345675')).toBe(false)
  })

  it('rechaza longitudes distintas de 10 y caracteres que no son dígitos', () => {
    expect(esCedulaValida('171234567')).toBe(false)
    expect(esCedulaValida('17123456750')).toBe(false)
    expect(esCedulaValida('17123456a5')).toBe(false)
    expect(esCedulaValida('')).toBe(false)
  })
})

describe('esRucValido', () => {
  it('acepta el RUC de persona natural: cédula válida + establecimiento', () => {
    expect(esRucValido(`${CEDULA_VALIDA}001`)).toBe(true)
  })

  it('rechaza el RUC de persona natural con una cédula inválida', () => {
    expect(esRucValido('1712345670001')).toBe(false)
  })

  it('acepta sociedades públicas (6) y privadas (9) por estructura', () => {
    expect(esRucValido('1760012345001')).toBe(true)
    expect(esRucValido('1790012345001')).toBe(true)
  })

  it('rechaza el establecimiento 000, el tercer dígito 7 u 8 y provincias inválidas', () => {
    expect(esRucValido(`${CEDULA_VALIDA}000`)).toBe(false)
    expect(esRucValido('1770012345001')).toBe(false)
    expect(esRucValido('1780012345001')).toBe(false)
    expect(esRucValido('2590012345001')).toBe(false)
  })

  it('rechaza longitudes distintas de 13', () => {
    expect(esRucValido(CEDULA_VALIDA)).toBe(false)
    expect(esRucValido(`${CEDULA_VALIDA}0011`)).toBe(false)
  })
})
