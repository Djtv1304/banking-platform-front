import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/shared/api'

const get = vi.hoisted(() => vi.fn())
vi.mock('@/shared/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/shared/api')>()
  return { ...original, apiClient: { get, post: vi.fn() } }
})

const { descargarSobrePin } = await import('@/features/tarjetas/api/tarjetas.api')

const respuesta = (status: number, data: Blob) => ({ status, data, headers: {}, config: { headers: {} }, statusText: '' })

beforeEach(() => get.mockReset())

describe('descargarSobrePin (TAR-07)', () => {
  it('pide el PDF como Blob y lo devuelve', async () => {
    const pdf = new Blob(['%PDF'], { type: 'application/pdf' })
    get.mockResolvedValue(respuesta(200, pdf))
    await expect(descargarSobrePin(7)).resolves.toBe(pdf)
    expect(get).toHaveBeenCalledWith('/api/v1/tarjetas/7/sobre-pin', expect.objectContaining({ responseType: 'blob' }))
  })

  it('lee el code del ProblemDetails que llega como Blob (SOBRE_PIN_ENTREGADO)', async () => {
    const problema = { status: 409, code: 'SOBRE_PIN_ENTREGADO', detail: 'El sobre de PIN ya se entregó.' }
    get.mockResolvedValue(respuesta(409, new Blob([JSON.stringify(problema)], { type: 'application/problem+json' })))
    const error = await descargarSobrePin(7).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 409, code: 'SOBRE_PIN_ENTREGADO' })
  })

  it('sin JSON en el error queda el código genérico del status', async () => {
    get.mockResolvedValue(respuesta(503, new Blob(['Service Unavailable'])))
    await expect(descargarSobrePin(7)).rejects.toMatchObject({ status: 503, code: 'http_503' })
  })

  it('deja 401 y 403 al interceptor del cliente', async () => {
    get.mockResolvedValue(respuesta(200, new Blob()))
    await descargarSobrePin(7)
    const { validateStatus } = get.mock.calls[0][1] as { validateStatus: (status: number) => boolean }
    expect(validateStatus(401)).toBe(false)
    expect(validateStatus(403)).toBe(false)
    expect(validateStatus(409)).toBe(true)
  })
})
