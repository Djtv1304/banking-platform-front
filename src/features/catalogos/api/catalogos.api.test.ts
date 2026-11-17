import { AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, apiClient } from '@/shared/api'
import { getActividadesEconomicas, getCiudades, getPaises, getProductos } from '@/features/catalogos/api/catalogos.api'

const casos = [
  { nombre: 'países', obtener: getPaises, ruta: '/api/v1/catalogos/paises', datos: [{ codigoPais: 'ECU', codigoNumerico: '218', nombrePais: 'Ecuador' }] },
  { nombre: 'ciudades del país elegido', obtener: () => getCiudades('COL'), ruta: '/api/v1/catalogos/paises/COL/ciudades', datos: [{ idCiudad: 3, codigoPais: 'COL', nombre: 'Bogotá', provincia: 'Cundinamarca' }] },
  { nombre: 'actividades económicas', obtener: getActividadesEconomicas, ruta: '/api/v1/catalogos/actividades-economicas', datos: [{ idActividadEconomica: 1, descripcion: 'Cultivo de cacao', areaActividad: 'Agricultura' }] },
]
const respuesta = (data: unknown) => ({ data, status: 200, statusText: 'OK', headers: {}, config: { headers: new AxiosHeaders() } })

afterEach(() => vi.restoreAllMocks())

describe.each(casos)('catálogo de $nombre', ({ obtener, ruta, datos }) => {
  it('consulta su ruta y valida el contrato JSON', async () => {
    const llamada = vi.spyOn(apiClient, 'get').mockResolvedValue(respuesta(datos))
    await expect(obtener()).resolves.toEqual(datos)
    expect(llamada.mock.calls[0][0]).toBe(ruta)
  })

  it('admite una lista vacía como resultado distinto de un fallo', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue(respuesta([]))
    await expect(obtener()).resolves.toEqual([])
  })

  it.each([{ datosInvalidos: '<!doctype html><html></html>' }, { datosInvalidos: [{}] }])('rechaza un 200 con contenido inválido: $datosInvalidos', async ({ datosInvalidos }) => {
    vi.spyOn(apiClient, 'get').mockResolvedValue(respuesta(datosInvalidos))
    await expect(obtener()).rejects.toMatchObject({ code: 'respuesta_invalida' })
  })

  it('propaga un error y permite que una nueva consulta se recupere', async () => {
    const error = new ApiError('Servicio no disponible', 503, 'http_503')
    vi.spyOn(apiClient, 'get').mockRejectedValueOnce(error).mockResolvedValueOnce(respuesta(datos))
    await expect(obtener()).rejects.toBe(error)
    await expect(obtener()).resolves.toEqual(datos)
  })
})


it('CAT-07 envia el cliente junto a los filtros para evaluar elegibilidad', async () => {
  const llamada = vi.spyOn(apiClient, 'get').mockResolvedValue(respuesta([]))
  await getProductos('Cuenta', undefined, 42)
  expect(llamada).toHaveBeenCalledWith('/api/v1/catalogos/productos', { params: { tipo: 'Cuenta', idCliente: '42' } })
})
