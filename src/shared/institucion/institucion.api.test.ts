import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import { INSTITUCION_KEY, institucionSchema, obtenerInstitucion } from '@/shared/institucion/institucion.api'

const datos = { nombre: 'Cooperativa Ámbito', sitioWeb: 'https://example.invalid', logoUrl: null, origen: 'ENTIDAD' }
afterEach(() => vi.restoreAllMocks())

describe('Presentación institucional', () => {
  it('acepta tildes y ausencia de configuración sin datos ficticios', () => {
    expect(institucionSchema.parse(datos).nombre).toBe('Cooperativa Ámbito')
    expect(institucionSchema.parse({ nombre: null, sitioWeb: null, logoUrl: null, origen: 'SIN_CONFIGURAR' }).nombre).toBeNull()
  })

  it.each(['javascript:alert(1)', 'http://example.invalid', '//example.invalid', 'https://user:pass@example.invalid'])('rechaza una web insegura: %s', sitioWeb => {
    expect(institucionSchema.safeParse({ ...datos, sitioWeb }).success).toBe(false)
  })

  it('valida el JSON y no acepta una página HTML con HTTP 200', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ status: 200, data: '<html>error</html>' })
    await expect(obtenerInstitucion()).rejects.toMatchObject({ code: 'respuesta_invalida' })
  })

  it('cancela la petición con la señal del consumidor', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ status: 200, data: datos })
    const signal = new AbortController().signal
    expect(await obtenerInstitucion(signal)).toEqual(datos)
    expect(get).toHaveBeenCalledWith('/api/v1/institucion', { signal })
  })

  it('conserva la última respuesta de caché si falla una actualización', async () => {
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    cache.setQueryData(INSTITUCION_KEY, datos)
    await expect(cache.fetchQuery({ queryKey: INSTITUCION_KEY, queryFn: () => Promise.reject(new Error('Caída')) })).rejects.toThrow('Caída')
    expect(cache.getQueryData(INSTITUCION_KEY)).toEqual(datos)
    cache.clear()
  })

})
