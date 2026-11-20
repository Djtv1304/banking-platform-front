import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/shared/api'
import { guardarVinculos, obtenerVinculos } from '@/features/organizacion/api/productos.api'
import { marcarComision, marcarSeguro, soloPropios, VINCULOS_VACIOS } from '@/features/organizacion/lib/vinculos'

vi.mock('@/shared/api', async original => {
  const modulo = await original<typeof import('@/shared/api')>()
  return { ...modulo, apiClient: { get: vi.fn(), put: vi.fn() } }
})

describe('Asociaciones reutilizables: contratos frontend existentes', () => {
  beforeEach(() => vi.clearAllMocks())
  it('asocia tasas distintas a modelos distintos sin crear tasas nuevas', async () => {
    vi.mocked(apiClient.put).mockImplementation(async (_url, data) => ({ status: 200, data }))
    const a1 = { ...soloPropios(VINCULOS_VACIOS), tasasInteres: [1] }
    const a2 = { ...soloPropios(VINCULOS_VACIOS), tasasInteres: [3] }
    await guardarVinculos({ tipo: 'subproducto', id: 41 }, a1)
    await guardarVinculos({ tipo: 'subproducto', id: 42 }, a2)
    expect(apiClient.put).toHaveBeenNthCalledWith(1, '/api/v1/productos/subproductos/41/vinculos', a1)
    expect(apiClient.put).toHaveBeenNthCalledWith(2, '/api/v1/productos/subproductos/42/vinculos', a2)
    expect(a1.tasasInteres).toEqual([1])
    expect(VINCULOS_VACIOS.tasasInteres).toEqual([])
  })
  it('guarda configuracion comun en el producto, sin confundirla con un modelo', async () => {
    const datos = marcarSeguro(marcarComision(soloPropios(VINCULOS_VACIOS), 2, true), 4, true, true)
    vi.mocked(apiClient.put).mockResolvedValue({ status: 200, data: datos })
    await guardarVinculos({ tipo: 'producto', id: 9 }, datos)
    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/productos/9/vinculos', datos)
  })
  it('conserva la herencia al consultar y solo envia los vinculos propios al guardar', async () => {
    const datos = { ...soloPropios(VINCULOS_VACIOS), tasasInteres: [3], delProducto: { ...soloPropios(VINCULOS_VACIOS), tasasInteres: [1] } }
    vi.mocked(apiClient.get).mockResolvedValue({ status: 200, data: datos })
    const respuesta = await obtenerVinculos({ tipo: 'subproducto', id: 41 })
    expect(respuesta.delProducto?.tasasInteres).toEqual([1])
    const propios = soloPropios(respuesta)
    vi.mocked(apiClient.put).mockResolvedValue({ status: 200, data: propios })
    await guardarVinculos({ tipo: 'subproducto', id: 41 }, propios)
    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/productos/subproductos/41/vinculos', expect.objectContaining({ tasasInteres: [3] }))
    expect(propios).not.toHaveProperty('delProducto')
  })
  it('la exoneracion no elimina la comision del producto ni cambia otros modelos', () => {
    const original = { ...soloPropios(VINCULOS_VACIOS), comisiones: [{ idComision: 2, exonerado: false }] }
    const personalizado = marcarComision(soloPropios(original), 2, true, true)
    expect(personalizado.comisiones).toEqual([{ idComision: 2, exonerado: true }])
    expect(original.comisiones).toEqual([{ idComision: 2, exonerado: false }])
  })
  it('propaga el rechazo backend, sin aparentar que se guardaron los cambios', async () => {
    const error = new Error('La configuracion no cumple las reglas del producto.')
    vi.mocked(apiClient.put).mockRejectedValue(error)
    await expect(guardarVinculos({ tipo: 'subproducto', id: 41 }, soloPropios(VINCULOS_VACIOS))).rejects.toBe(error)
  })
})
