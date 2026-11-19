import { afterEach, describe, expect, it, vi } from 'vitest'
import { AxiosHeaders } from 'axios'
import { ApiError, apiClient } from '@/shared/api'
import { consultarConfiguracion, guardarConfiguracion, exigeReconsulta } from '@/features/seguridad/api/accesos.api'

const configuracion = { version: 'a'.repeat(64), activa: true, pestanas: [], secciones: [] }
const response = (data: unknown, status = 200) => ({ data, status, statusText: 'OK', headers: {}, config: { headers: new AxiosHeaders() } })
afterEach(() => vi.restoreAllMocks())

describe('Contrato de accesos sobre la configuración SQL existente', () => {
  it('no interpreta HTML ni una respuesta parcial como configuración válida', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue(response('<html>SPA</html>'))
    await expect(consultarConfiguracion()).rejects.toMatchObject({ code: 'respuesta_invalida' })
    get.mockResolvedValue(response({ pestanas: [] }))
    await expect(consultarConfiguracion()).rejects.toMatchObject({ code: 'respuesta_invalida' })
  })
  it.each([true, false])('conserva el estado de activación sin confundirlo con el guardado: %s', async (activa) => {
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue(response({ ...configuracion, activa, estado: 'GUARDADO' }))
    const datos = { version: configuracion.version, motivo: 'Ajuste del acceso del puesto', pestanas: [{ pestana: '/clientes-busqueda', roles: ['ASESOR'] }] }
    const guardada = await guardarConfiguracion(datos)
    expect(put).toHaveBeenCalledExactlyOnceWith('/api/v1/seguridad/pestanas/configuracion', datos)
    expect(guardada.activa).toBe(activa)
    expect(guardada.estado).toBe('GUARDADO')
  })
  it('no confirma un resultado de guardado incompleto', async () => {
    vi.spyOn(apiClient, 'put').mockResolvedValue(response(configuracion))
    await expect(guardarConfiguracion({ version: configuracion.version, motivo: 'Ajuste del acceso del puesto', pestanas: [] })).rejects.toMatchObject({ code: 'resultado_no_confirmado' })
  })
  it.each([null, 409, 500, 503])('exige reconsulta antes de repetir un resultado incierto: %s', (status) => {
    expect(exigeReconsulta(new ApiError('Fallo', status, 'fallo'))).toBe(true)
  })
  it('permite corregir una validación local sin perder el borrador', () => {
    expect(exigeReconsulta(new ApiError('Validación', 422, 'ROL_INCOMPATIBLE'))).toBe(false)
  })
})
