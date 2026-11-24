import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/shared/api'
import { getTiposDireccion } from '@/features/catalogos/hooks/useTiposDireccion'

afterEach(() => vi.restoreAllMocks())

describe('catálogo de tipos de dirección', () => {
  it('consulta códigos nuevos y conserva nombres retirados para la edición histórica', async () => {
    const tipos = [
      { codigo: 'Temporal', nombre: 'Alojamiento temporal', estado: 'A' },
      { codigo: 'Otra', nombre: 'Tipo anterior', estado: 'I' },
    ]
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: tipos })
    await expect(getTiposDireccion()).resolves.toEqual(tipos)
    expect(get).toHaveBeenCalledWith('/api/v1/catalogos/tipos-direccion')
  })

  it('rechaza respuestas HTML o estados no documentados', async () => {
    vi.spyOn(apiClient, 'get')
      .mockResolvedValueOnce({ data: '<html>Sin API</html>' })
      .mockResolvedValueOnce({ data: [{ codigo: 'Temporal', nombre: 'Temporal', estado: 'Desconocido' }] })
    await expect(getTiposDireccion()).rejects.toMatchObject({ code: 'respuesta_invalida' })
    await expect(getTiposDireccion()).rejects.toMatchObject({ code: 'respuesta_invalida' })
  })
})
