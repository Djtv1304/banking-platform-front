import { AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/shared/api'
import { agregarDireccion, darBajaDireccion, editarDireccion, listarDirecciones } from '@/features/clientes/api/direcciones.api'
import { payloadDireccion, valoresDireccion } from '@/features/clientes/lib/direcciones'

const direccion = {
  idDireccion: 8, tipoDireccion: 'Trabajo' as const, codigoPais: 'COL', idCiudad: 3,
  sector: null, calleDireccion: 'Calle de prueba', referenciaUbicacion: 'Parque ficticio',
  codigoPostal: null, esPrincipal: false, estado: 'Activo' as const,
}
const respuesta = (data: unknown, status = 200) => ({ data, status, statusText: 'OK', headers: {}, config: { headers: new AxiosHeaders() } })
afterEach(() => vi.restoreAllMocks())

describe('C-07 transporte y respuestas', () => {
  it('lista con cancelación y conserva estado/catálogo para editar', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue(respuesta([direccion, { ...direccion, idDireccion: 9, estado: 'Inactivo' }]))
    const signal = new AbortController().signal
    const lista = await listarDirecciones(1042, signal)
    expect(get).toHaveBeenCalledWith('/api/v1/clientes/1042/direcciones', { signal })
    expect(lista[0]).toEqual(direccion)
    expect(lista[1].estado).toBe('Inactivo')
  })
  it('acepta una lista vacía y rechaza HTML con 200', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce(respuesta([])).mockResolvedValueOnce(respuesta('<html>Sin backend</html>'))
    await expect(listarDirecciones(1042)).resolves.toEqual([])
    await expect(listarDirecciones(1042)).rejects.toMatchObject({ code: 'respuesta_invalida' })
  })
  it('crea con tipos exactos y campos del contrato, sin provincia ni idDireccion', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue(respuesta(direccion, 201))
    const body = payloadDireccion(valoresDireccion(direccion))
    await expect(agregarDireccion(1042, body)).resolves.toEqual(direccion)
    expect(post).toHaveBeenCalledWith('/api/v1/clientes/1042/direcciones', body)
    expect(post.mock.calls[0][1]).not.toHaveProperty('provincia')
    expect(post.mock.calls[0][1]).not.toHaveProperty('idDireccion')
  })
  it('promueve principal con un PATCH mínimo', async () => {
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue(respuesta({ ...direccion, esPrincipal: true }))
    await expect(editarDireccion(1042, 8, { esPrincipal: true })).resolves.toMatchObject({ esPrincipal: true })
    expect(patch).toHaveBeenCalledWith('/api/v1/clientes/1042/direcciones/8', { esPrincipal: true })
  })
  it('no envía un PATCH vacío', async () => {
    const patch = vi.spyOn(apiClient, 'patch')
    await expect(editarDireccion(1042, 8, {})).rejects.toThrow()
    expect(patch).not.toHaveBeenCalled()
  })
  it('procesa la baja sin intentar interpretar un body 204', async () => {
    const eliminar = vi.spyOn(apiClient, 'delete').mockResolvedValue(respuesta('', 204))
    await expect(darBajaDireccion(1042, 8)).resolves.toBeUndefined()
    expect(eliminar).toHaveBeenCalledWith('/api/v1/clientes/1042/direcciones/8')
  })
  it('propaga conflictos de principal sin tratarlos como éxito', async () => {
    vi.spyOn(apiClient, 'delete').mockRejectedValue({ status: 409, code: 'NO_SE_PUEDE_ELIMINAR_PRINCIPAL' })
    await expect(darBajaDireccion(1042, 8)).rejects.toMatchObject({ status: 409, code: 'NO_SE_PUEDE_ELIMINAR_PRINCIPAL' })
  })
})
