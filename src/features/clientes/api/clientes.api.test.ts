import { AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { apiClient } from '@/shared/api'
import { descargarCsv } from '@/shared/lib'
import { buscarClientes, exportarClientes, getCliente } from '@/features/clientes/api/clientes.api'
import { FILTRO_REQUERIDO } from '@/features/clientes/api/clientes.contract'

vi.mock('@/shared/lib', async (importOriginal) => ({ ...await importOriginal<typeof import('@/shared/lib')>(), descargarCsv: vi.fn() }))

const respuesta = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  ({ data, status, statusText: 'OK', headers, config: { headers: new AxiosHeaders() } })
const fila = { idCliente: 7, identificacion: '******4065', tipoCliente: 'Natural', nombres: 'María', apellidos: 'Pérez', razonSocial: null, estado: 'Activo', idAgenciaRegistro: '001' }
afterEach(() => vi.restoreAllMocks())

describe('E5-05 · búsqueda por POST con los filtros en el cuerpo', () => {
  it('envía el cuerpo validado, nunca parámetros en la URL', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue(respuesta({ items: [fila], page: 1, pageSize: 20, total: 1 }))
    const get = vi.spyOn(apiClient, 'get')
    const signal = new AbortController().signal
    const pagina = await buscarClientes({ nombre: ' mar ', idAgenciaRegistro: '001', page: 1, pageSize: 20 }, signal)
    expect(pagina.items[0]).toMatchObject({ identificacion: '******4065', idAgenciaRegistro: '001' })
    expect(post).toHaveBeenCalledWith('/api/v1/clientes/busqueda', { nombre: 'mar', idAgenciaRegistro: '001', page: 1, pageSize: 20 }, { signal })
    expect(get).not.toHaveBeenCalled()
  })

  it('sin filtro (o solo con tipo de cliente) no consulta', async () => {
    const post = vi.spyOn(apiClient, 'post')
    await expect(buscarClientes({ tipoCliente: 'Natural', page: 1 })).rejects.toMatchObject({ code: 'FILTRO_REQUERIDO', message: FILTRO_REQUERIDO })
    expect(post).not.toHaveBeenCalled()
  })

  it.each([
    [{ nombre: 'ma' }, 'al menos 3'],
    [{ idAgenciaRegistro: '1' }, '3 dígitos'],
    [{ email: 'maria@' }, 'correo completo'],
  ])('rechaza filtros inválidos %o', async (filtro, mensaje) => {
    const post = vi.spyOn(apiClient, 'post')
    await expect(buscarClientes(filtro)).rejects.toMatchObject({ code: 'DATOS_INVALIDOS', message: expect.stringContaining(mensaje) })
    expect(post).not.toHaveBeenCalled()
  })

  it('rechaza campos fuera del contrato', async () => {
    await expect(buscarClientes({ estado: 'Activo', q: 'x' } as never)).rejects.toMatchObject({ code: 'DATOS_INVALIDOS' })
  })

  it('una respuesta que no es la página esperada es inválida', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue(respuesta('<html></html>'))
    await expect(buscarClientes({ estado: 'Activo' })).rejects.toMatchObject({ code: 'respuesta_invalida' })
  })

  it('la ficha trae la agencia de registro y los datos enmascarados', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue(respuesta({
      ...fila, tipoDocumento: 'C', email: 'm***@correo.ec', telefonoCelular: '******4567', telefonoConvencional: null,
      nombreComercial: null, estadoCivil: null, idActividadEconomica: null, fechaNacimiento: '1990-01-01', fechaRegistro: '2026-01-01', direcciones: [],
    }))
    await expect(getCliente(7)).resolves.toMatchObject({ idAgenciaRegistro: '001', email: 'm***@correo.ec' })
  })
})

describe('E5-05 · exportación CSV', () => {
  it('descarga clientes.csv con el mismo cuerpo de la búsqueda', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue(respuesta('\uFEFFid;nombre\r\n7;María', 200, { 'content-type': 'text/csv; charset=utf-8' }))
    await exportarClientes({ estado: 'Activo', page: 1 })
    expect(post).toHaveBeenCalledWith('/api/v1/clientes/busqueda/exportacion', { estado: 'Activo', page: 1 }, { responseType: 'text' })
    expect(descargarCsv).toHaveBeenCalledWith('clientes.csv', 'id;nombre\r\n7;María')
  })

  it('no descarga si la respuesta no es CSV', async () => {
    vi.mocked(descargarCsv).mockClear()
    vi.spyOn(apiClient, 'post').mockResolvedValue(respuesta('<html></html>', 200, { 'content-type': 'text/html' }))
    await expect(exportarClientes({ estado: 'Activo' })).rejects.toMatchObject({ code: 'respuesta_invalida' })
    expect(descargarCsv).not.toHaveBeenCalled()
  })

  it('sin filtro no exporta', async () => {
    const post = vi.spyOn(apiClient, 'post')
    await expect(exportarClientes({})).rejects.toMatchObject({ code: 'FILTRO_REQUERIDO' })
    expect(post).not.toHaveBeenCalled()
  })
})
