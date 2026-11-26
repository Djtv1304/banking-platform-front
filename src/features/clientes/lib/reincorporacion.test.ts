import { describe, expect, it } from 'vitest'
import { ApiError } from '@/shared/api'
import {
  BOTON_SOLICITAR_REINCORPORACION,
  esErrorClienteEliminado,
  MENSAJE_CLIENTE_ELIMINADO,
  resolverAvisoAlta,
} from '@/features/clientes/lib/reincorporacion'

describe('reincorporacion lib · funciones puras', () => {
  it.each([
    [new ApiError('Eliminado', 409, 'CLIENTE_ELIMINADO'), true],
    [new ApiError('Duplicado', 409, 'CLIENTE_DUPLICADO'), false],
    [new Error('Error desconocido'), false],
    [null, false],
    [undefined, false],
  ])('esErrorClienteEliminado (%s -> %s)', (error, esperado) => {
    expect(esErrorClienteEliminado(error)).toBe(esperado)
  })

  it.each([
    [{ idSolicitud: 55 }, 'aprobacion'],
    [{ error: new ApiError('', 409, 'CLIENTE_ELIMINADO') }, 'reincorporacion'],
    [{ error: new ApiError('', 409, 'CLIENTE_DUPLICADO') }, 'ninguno'],
    [{}, 'ninguno'],
  ])('resolverAvisoAlta resuelve la decision correcta (%j -> %s)', (entrada, esperado) => {
    expect(resolverAvisoAlta(entrada).tipo).toBe(esperado)
  })

  it('conserva los textos canónicos del dominio', () => {
    expect(MENSAJE_CLIENTE_ELIMINADO).toContain('Esta persona fue cliente y está eliminada')
    expect(BOTON_SOLICITAR_REINCORPORACION).toBe('Solicitar reincorporación')
  })
})
