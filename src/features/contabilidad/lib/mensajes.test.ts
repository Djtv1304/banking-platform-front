import { describe, expect, it } from 'vitest'

import { ApiError } from '@/shared/api'
import { MENSAJE_NO_DISPONIBLE, erroresDeCampo, esNoDisponible, mensajeErrorPlanCuentas, mensajeResultado } from '@/features/contabilidad/lib/mensajes'

describe('mensajeErrorPlanCuentas', () => {
  it('un endpoint que todavía no existe se explica como no disponible', () => {
    for (const error of [
      new ApiError('Not Implemented', 501, 'HTTP_501'),
      new ApiError('Not Found', 404, 'HTTP_404'),
      new ApiError('Method Not Allowed', 405, 'http_405'),
      new ApiError('La funcion no esta disponible.', 404, 'FUNCION_NO_DISPONIBLE'),
      new ApiError('Operación no habilitada', 501, 'OPERACION_NO_HABILITADA'),
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
    expect(mensajeErrorPlanCuentas(new ApiError('x', 403, 'PERMISO_DENEGADO'), 'mantenimiento')).toBe(
      'Solo un contador puede cambiar el plan de cuentas.',
    )
  })

  it('usa los códigos reales del backend para la cuenta inexistente y la del regulador', () => {
    expect(mensajeErrorPlanCuentas(new ApiError('La cuenta no existe.', 404, 'CUENTA_NO_ENCONTRADA'), 'mantenimiento')).toBe(
      'La cuenta ya no existe. Recarga el plan de cuentas.',
    )
    expect(mensajeErrorPlanCuentas(new ApiError('x', 409, 'CUENTA_DEL_REGULADOR'), 'mantenimiento')).toMatch(/regulador/)
  })

  it('explica las reglas del alta de subcuentas por code', () => {
    const mensaje = (status: number, code: string) => mensajeErrorPlanCuentas(new ApiError('x', status, code), 'mantenimiento')
    expect(mensaje(422, 'CODIGO_NO_CORRESPONDE_AL_PADRE')).toBe('El código debe empezar por el de la cuenta superior y tener 8 dígitos.')
    expect(mensaje(409, 'CUENTA_SUPERIOR_CON_MOVIMIENTOS')).toBe(
      'La cuenta superior ya tiene movimientos o saldo: no se le pueden crear subcuentas.',
    )
    expect(mensaje(404, 'CUENTA_SUPERIOR_NO_ENCONTRADA')).toBe('La cuenta superior ya no existe. Recarga el plan de cuentas.')
    expect(mensaje(422, 'DB_51100')).toBe('La cuenta superior recibe movimientos y no admite subcuentas.')
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

  it('los errores del padre y del trigger van a un mensaje general, no al campo', () => {
    for (const code of ['CUENTA_SUPERIOR_CON_MOVIMIENTOS', 'CUENTA_SUPERIOR_NO_ENCONTRADA', 'DB_51100']) {
      expect(erroresDeCampo(new ApiError('x', 409, code), ['codigoCuenta', 'nombreCuenta']).size).toBe(0)
    }
  })
})

describe('mensajeResultado', () => {
  it('un 202 avisa que quedó pendiente de aprobación', () => {
    expect(mensajeResultado(true, 'Listo')).toMatch(/aprobación/)
    expect(mensajeResultado(false, 'Listo')).toBe('Listo')
  })
})
