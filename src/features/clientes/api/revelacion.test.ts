import { AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, apiClient } from '@/shared/api'
import { errorRevelacion, pedirDesafioRevelacion, revelacionBodySchema, revelarDatos } from '@/features/clientes/api/revelacion'

const respuesta = (data: unknown, status = 200) => ({ data, status, statusText: 'OK', headers: {}, config: { headers: new AxiosHeaders() } })
afterEach(() => vi.restoreAllMocks())

describe('E5-05 · revelación auditada con MFA', () => {
  it('pide el desafío sin cuerpo', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue(respuesta({ idDesafio: 'abc', expiraEn: null }))
    await expect(pedirDesafioRevelacion(42)).resolves.toEqual({ idDesafio: 'abc', expiraEn: null, requiereCodigo: true })
    expect(post).toHaveBeenCalledWith('/api/v1/clientes/42/revelacion/desafio')
  })

  it('con el MFA apagado en el backend no hay desafío ni código', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue(respuesta({ idDesafio: null, expiraEn: null, requiereCodigo: false }))
    await expect(pedirDesafioRevelacion(42)).resolves.toEqual({ idDesafio: null, expiraEn: null, requiereCodigo: false })
  })

  it('rechaza un desafío con forma inesperada', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue(respuesta({ expiraEn: null }))
    await expect(pedirDesafioRevelacion(42)).rejects.toMatchObject({ code: 'respuesta_invalida' })
  })

  it('envía campos, desafío y código; los no pedidos quedan null', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue(respuesta({ identificacion: '1710034065' }))
    await expect(revelarDatos(42, { campos: ['identificacion'], idDesafio: 'abc', codigo: '123456' })).resolves.toEqual({
      identificacion: '1710034065', email: null, telefonoCelular: null, telefonoConvencional: null, correosSecundarios: null,
    })
    expect(post).toHaveBeenCalledWith('/api/v1/clientes/42/revelacion', { campos: ['identificacion'], idDesafio: 'abc', codigo: '123456' })
  })

  it('valida el cuerpo antes de enviar', () => {
    const base = { campos: ['email'], idDesafio: 'abc', codigo: '123456' }
    expect(revelacionBodySchema.safeParse(base).success).toBe(true)
    expect(revelacionBodySchema.safeParse({ ...base, codigo: '12345' }).success).toBe(false)
    expect(revelacionBodySchema.safeParse({ ...base, codigo: '12345a' }).success).toBe(false)
    expect(revelacionBodySchema.safeParse({ ...base, campos: [] }).success).toBe(false)
    expect(revelacionBodySchema.safeParse({ ...base, campos: ['email', 'email'] }).success).toBe(false)
    expect(revelacionBodySchema.safeParse({ ...base, campos: ['direccion'] }).success).toBe(false)
    expect(revelacionBodySchema.safeParse({ ...base, extra: 1 }).success).toBe(false)
  })

  it('explica cada error y pide un código nuevo solo con MFA_INVALIDO', () => {
    expect(errorRevelacion(new ApiError('x', 409, 'MFA_NO_CONFIGURADO'))).toMatchObject({ mensaje: expect.stringContaining('app de autenticación'), nuevoCodigo: false })
    expect(errorRevelacion(new ApiError('x', 422, 'MFA_INVALIDO'))).toEqual({ mensaje: expect.stringContaining('código nuevo'), nuevoCodigo: true })
    expect(errorRevelacion(new ApiError('x', 429, 'http_429')).mensaje).toContain('Espera un minuto')
    expect(errorRevelacion(new ApiError('x', 503, 'MFA_NO_DISPONIBLE')).mensaje).toContain('no está disponible')
    expect(errorRevelacion(new ApiError('Sin permiso', 403, 'SIN_PERMISO')).mensaje).toBe('Sin permiso')
  })
})
