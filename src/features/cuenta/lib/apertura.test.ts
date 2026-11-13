import { describe, expect, it } from 'vitest'

import { ApiError } from '@/shared/api'
import { campoErrorApertura, mensajeErrorApertura } from '@/features/cuenta/lib/apertura'
import {
  aCuentaCreate,
  aperturaVacia,
  crearAperturaCuentaSchema,
  type AperturaCuentaInput,
} from '@/features/cuenta/schemas/apertura-cuenta.schema'

const valido: AperturaCuentaInput = { idSubProducto: '3', idAgencia: '001', montoInicial: '50' }

const errores = (input: AperturaCuentaInput, minimo: number | null = 50) => {
  const result = crearAperturaCuentaSchema(minimo).safeParse(input)
  return result.success ? {} : Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message]))
}

describe('crearAperturaCuentaSchema', () => {
  it('acepta un depósito igual al mínimo y arma el body en USD', () => {
    const result = crearAperturaCuentaSchema(50).safeParse({ ...valido, montoInicial: '50,00' })
    expect(result.success).toBe(true)
    expect(aCuentaCreate(result.data!, 7)).toEqual({
      idCliente: 7,
      idSubProducto: 3,
      idAgencia: '001',
      montoInicial: 50,
      idMoneda: 840,
    })
  })

  it('rechaza un depósito bajo el mínimo del producto', () => {
    expect(errores({ ...valido, montoInicial: '49.99' }).montoInicial).toMatch(/mínimo de apertura .*50,00/)
  })

  it('rechaza un monto con 3 decimales o con letras', () => {
    expect(errores({ ...valido, montoInicial: '50.123' }).montoInicial).toMatch(/2 decimales como máximo/)
    expect(errores({ ...valido, montoInicial: '5O' }).montoInicial).toMatch(/monto válido/)
  })

  it('sin mínimo configurado admite 0', () => {
    expect(errores({ ...valido, montoInicial: '0' }, null)).toEqual({})
  })

  it('pide los campos faltantes', () => {
    expect(errores(aperturaVacia())).toEqual({
      idSubProducto: 'Selecciona el producto de la cuenta.',
      idAgencia: 'Selecciona la agencia donde se abre la cuenta.',
      montoInicial: 'Ingresa el depósito de apertura.',
    })
  })
})

describe('mensajeErrorApertura', () => {
  const error = (status: number, code: string, message = 'del servidor') => new ApiError(message, status, code)

  it.each([
    [409, 'CLIENTE_NO_ACTIVO', /no está activo/],
    [409, 'RIESGO_RECHAZADO', /riesgo vigente rechazada/],
    [422, 'PRODUCTO_NO_ES_CUENTA', /producto elegido/],
    [422, 'MONTO_APERTURA_INSUFICIENTE', /mínimo de apertura/],
    [409, 'AGENCIA_INACTIVA', /agencia elegida/],
    [400, 'DATOS_INVALIDOS', /Revisa los datos/],
  ])('%i %s tiene un mensaje propio', (status, code, mensaje) => {
    expect(mensajeErrorApertura(error(status, code))).toMatch(mensaje)
  })

  it('un 403 dice que no tiene permiso', () => {
    expect(mensajeErrorApertura(error(403, 'http_403'))).toBe('No tienes permiso para abrir cuentas.')
  })

  it('un código desconocido conserva el mensaje del servidor', () => {
    expect(mensajeErrorApertura(error(500, 'ERROR_INTERNO', 'Algo falló'))).toBe('Algo falló')
  })

  it('ubica en su campo los errores de producto, monto y agencia', () => {
    expect(campoErrorApertura(error(422, 'PRODUCTO_NO_ES_CUENTA'))).toBe('idSubProducto')
    expect(campoErrorApertura(error(422, 'MONTO_APERTURA_INSUFICIENTE'))).toBe('montoInicial')
    expect(campoErrorApertura(error(409, 'AGENCIA_INACTIVA'))).toBe('idAgencia')
    expect(campoErrorApertura(error(409, 'CLIENTE_NO_ACTIVO'))).toBeNull()
  })
})
