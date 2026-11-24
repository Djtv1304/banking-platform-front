import { describe, expect, it } from 'vitest'

import { ApiError } from '@/shared/api'
import { campoErrorApertura, mensajeErrorApertura } from '@/features/cuenta/lib/apertura'
import {
  aCuentaCreate,
  aperturaVacia,
  aperturaCuentaSchema,
} from '@/features/cuenta/schemas/apertura-cuenta.schema'

describe('aperturaCuentaSchema', () => {
  it('envia solo el cliente y subproducto al abrir con saldo cero', () => {
    const valores = aperturaCuentaSchema.parse({ idSubProducto: '3' })
    expect(aCuentaCreate(valores, 7)).toEqual({ idCliente: 7, idSubProducto: 3 })
  })

  it('pide un subproducto', () => {
    expect(aperturaCuentaSchema.safeParse(aperturaVacia).success).toBe(false)
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

  it('ubica en su campo los errores de producto', () => {
    expect(campoErrorApertura(error(422, 'PRODUCTO_NO_ES_CUENTA'))).toBe('idSubProducto')
    expect(campoErrorApertura(error(422, 'MONTO_APERTURA_INSUFICIENTE'))).toBeNull()
    expect(campoErrorApertura(error(409, 'AGENCIA_INACTIVA'))).toBeNull()
    expect(campoErrorApertura(error(409, 'CLIENTE_NO_ACTIVO'))).toBeNull()
  })
})
