import { AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { apiClient } from '@/shared/api'
import { consultarHabilitacion, motivoHabilitacion } from '@/features/clientes/api/habilitacion'

const respuesta = (data: unknown) => ({ data, status: 200, statusText: 'OK', headers: {}, config: { headers: new AxiosHeaders() } })
afterEach(() => vi.restoreAllMocks())

describe('E5-05 · habilitación para recibir productos', () => {
  it('consulta y valida la respuesta', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue(respuesta({ habilitado: false, motivos: ['CLIENTE_NO_ACTIVO'] }))
    await expect(consultarHabilitacion(42)).resolves.toEqual({ habilitado: false, motivos: ['CLIENTE_NO_ACTIVO'] })
    expect(get).toHaveBeenCalledWith('/api/v1/clientes/42/habilitacion', { signal: undefined })
    get.mockResolvedValue(respuesta('<html>'))
    await expect(consultarHabilitacion(42)).rejects.toMatchObject({ code: 'respuesta_invalida' })
  })

  it('traduce los motivos y oculta los informativos', () => {
    expect(motivoHabilitacion('RIESGO_NO_APROBADO_VIGENTE')).toContain('evaluación de riesgo')
    expect(motivoHabilitacion('ARCHIVO_OBLIGATORIO_FALTANTE:Cedula')).toBe('Falta el archivo obligatorio Cedula.')
    expect(motivoHabilitacion('ARCHIVOS_NO_EXIGIDOS')).toBeNull()
    expect(motivoHabilitacion('OTRO')).toContain('requisito pendiente')
  })
})
