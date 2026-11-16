import { describe, expect, it } from 'vitest'

import { ApiError } from '@/shared/api'
import { MENSAJE_NO_DISPONIBLE, erroresDeCampo, esNoDisponible, mensajeErrorPlanCuentas, mensajeResultado } from '@/features/contabilidad/lib/mensajes'

describe('mensajeErrorPlanCuentas', () => {
  it('un endpoint que todavía no existe se explica como no disponible', () => {
    for (const error of [
      new ApiError('Not Implemented', 501, 'HTTP_501'),
      new ApiError('Not Found', 404, 'HTTP_404'),
      new ApiError('Method Not Allowed', 405, 'http_405'),
    ]) {
      expect(esNoDisponible(error)).toBe(true)
      expect(mensajeErrorPlanCuentas(error, 'mantenimiento')).toBe(MENSAJE_NO_DISPONIBLE)
    }
  })

  it('un 404 con code propio no es «no disponible»', () => {
    const error = new ApiError('No existe', 404, 'CUENTA_CONTABLE_NO_ENCONTRADA')
    expect(esNoDisponible(error)).toBe(false)
    expect(mensajeErrorPlanCuentas(error, 'mantenimiento')).toMatch(/ya no existe/)
  })

  it('traduce las reglas de negocio y el 403 según la operación', () => {
    expect(mensajeErrorPlanCuentas(new ApiError('x', 409, 'CUENTA_EN_USO'), 'mantenimiento')).toMatch(/movimientos/)
    expect(mensajeErrorPlanCuentas(new ApiError('x', 409, 'CUENTA_CON_SALDO'), 'mantenimiento')).toMatch(/saldo/)
    expect(mensajeErrorPlanCuentas(new ApiError('x', 403, 'PERMISO_DENEGADO'), 'consulta')).toMatch(/no tiene acceso/)
    expect(mensajeErrorPlanCuentas(new ApiError('x', 403, 'PERMISO_DENEGADO'), 'mantenimiento')).toMatch(/contador/)
  })

  it('un code desconocido usa el mensaje del backend', () => {
    expect(mensajeErrorPlanCuentas(new ApiError('Algo pasó', 500, 'ERROR_INTERNO'), 'consulta')).toBe('Algo pasó')
  })
})

describe('erroresDeCampo', () => {
  it('lleva los errors[] de DATOS_INVALIDOS a su campo', () => {
    const error = new ApiError('Datos inválidos', 400, 'DATOS_INVALIDOS', [
      { field: 'body.nombreCuenta', message: 'Demasiado largo' },
      { field: 'otro', message: 'x' },
    ])
    expect([...erroresDeCampo(error, ['codigoCuenta', 'nombreCuenta'])]).toEqual([['nombreCuenta', 'Demasiado largo']])
  })

  it('CODIGO_NO_CORRESPONDE_AL_PADRE va al campo del código', () => {
    const error = new ApiError('x', 422, 'CODIGO_NO_CORRESPONDE_AL_PADRE')
    expect(erroresDeCampo(error, ['codigoCuenta', 'nombreCuenta']).get('codigoCuenta')).toMatch(/cuenta superior/)
    expect(erroresDeCampo(error, ['nombreCuenta']).size).toBe(0)
  })
})

describe('mensajeResultado', () => {
  it('un 202 avisa que quedó pendiente de aprobación', () => {
    expect(mensajeResultado(true, 'Listo')).toMatch(/aprobación/)
    expect(mensajeResultado(false, 'Listo')).toBe('Listo')
  })
})
