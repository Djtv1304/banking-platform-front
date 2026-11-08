import { describe, expect, it } from 'vitest'

import { ApiError, toApiError } from '@/shared/api/errors'

/** Lo mínimo que `isAxiosError` reconoce como error de Axios */
function axiosError(status?: number, data?: unknown) {
  return { isAxiosError: true, message: 'Request failed', response: status ? { status, data } : undefined }
}

describe('toApiError', () => {
  it('lee el ProblemDetails del backend (F-04): detail como mensaje y code', () => {
    const error = toApiError(
      axiosError(409, {
        type: 'about:blank',
        title: 'Conflict',
        status: 409,
        code: 'JORNADA_NO_ABIERTA',
        detail: 'La jornada no está abierta.',
        traceId: 'req-123',
      }),
    )
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(409)
    expect(error.code).toBe('JORNADA_NO_ABIERTA')
    expect(error.message).toBe('La jornada no está abierta.')
  })

  it('lee el 401 del backend sin sesión', () => {
    const error = toApiError(axiosError(401, { status: 401, code: 'NO_AUTENTICADO', detail: 'Inicie sesión para continuar.' }))
    expect(error.status).toBe(401)
    expect(error.code).toBe('NO_AUTENTICADO')
  })

  it('lee el error del Worker cuando el backend no responde', () => {
    const error = toApiError(
      axiosError(502, { detail: { code: 'BACKEND_NO_DISPONIBLE', message: 'El servicio no está disponible.' } }),
    )
    expect(error.code).toBe('BACKEND_NO_DISPONIBLE')
    expect(error.message).toBe('El servicio no está disponible.')
  })

  it('toma el primer mensaje de una validación de FastAPI', () => {
    const error = toApiError(axiosError(422, { detail: [{ msg: 'Campo requerido', loc: ['body', 'monto'] }] }))
    expect(error.code).toBe('validation_error')
    expect(error.message).toBe('Campo requerido')
  })

  it('usa title y un code por status cuando no hay detail', () => {
    const error = toApiError(axiosError(500, { title: 'Internal Server Error' }))
    expect(error.code).toBe('http_500')
    expect(error.message).toBe('Internal Server Error')
  })

  it('sin respuesta es un error de red', () => {
    const error = toApiError(axiosError())
    expect(error.status).toBeNull()
    expect(error.code).toBe('network_error')
  })

  it('un error que no es de Axios queda como desconocido y un ApiError pasa igual', () => {
    expect(toApiError(new Error('x')).code).toBe('unknown')
    const original = new ApiError('m', 400, 'C')
    expect(toApiError(original)).toBe(original)
  })
})
