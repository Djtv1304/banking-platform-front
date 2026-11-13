import { afterEach, describe, expect, it, vi } from 'vitest'
import { AxiosHeaders } from 'axios'
import { ApiError, apiClient } from '@/shared/api'
import { consultarExistenciaEntidad, crearEntidad, entidadCreateSchema } from '@/features/organizacion/api/entidad'
import { datosCrearEntidad, valoresEntidadInicial } from '@/features/organizacion/lib/entidad-form'
import { fechaDesdePartes } from '@/shared/lib/fecha-partes'

const datos = {
  ruc: '1790000000001', razonSocial: 'Cooperativa Ficticia Enquo',
  fechaConstitucion: '2000-01-15', representanteLegal: 'Representante Ficticio',
  identificacionRepresentante: 'DEMO12345',
}
const persistida = {
  ...datos, idEntidad: 1, nombreComercial: null, tipoOrganizacion: 'Cooperativa de Ahorro y Credito',
  segmento: null, numeroResolucionSeps: null, telefono: null, email: null, sitioWeb: null,
  estado: 'A', fechaRegistro: '2026-11-12T12:00:00', modificadoPor: 1,
}
const respuesta = (data: unknown, status = 201) => ({
  data, status, statusText: 'Created', headers: {}, config: { headers: new AxiosHeaders() },
})

afterEach(() => vi.restoreAllMocks())

describe('POST de entidad · contrato integrado en #335', () => {
  it('admite los cinco obligatorios y deja los valores predeterminados al backend', () => {
    expect(entidadCreateSchema.parse(datos)).toEqual(datos)
  })

  it.each(['ruc', 'razonSocial', 'fechaConstitucion', 'representanteLegal', 'identificacionRepresentante'])('exige %s', campo => {
    const incompletos: Record<string, unknown> = { ...datos }
    delete incompletos[campo]
    expect(entidadCreateSchema.safeParse(incompletos).success).toBe(false)
  })

  it.each(['idEntidad', 'modificadoPor', 'fechaRegistro', 'estado'])('no permite enviar %s desde esta pantalla', async campo => {
    const post = vi.spyOn(apiClient, 'post')
    await expect(crearEntidad({ ...datos, [campo]: 'no autorizado' })).rejects.toThrow()
    expect(post).not.toHaveBeenCalled()
  })

  it('serializa opcionales vacíos y segmento numérico sin incluir auditoría', () => {
    const body = datosCrearEntidad({ ...valoresEntidadInicial(), ...datos, segmento: '2', identificacionRepresentante: 'demo12345' })
    expect(body.segmento).toBe(2)
    expect(body.email).toBeNull()
    expect(body.identificacionRepresentante).toBe('DEMO12345')
    expect(body).not.toHaveProperty('idEntidad')
    expect(body).not.toHaveProperty('estado')
  })

  it('mantiene ISO para backend aunque la interfaz pida día/mes/año', () => {
    const fecha = fechaDesdePartes({ dia: '05', mes: '11', anio: '2000' })
    const body = datosCrearEntidad({ ...valoresEntidadInicial(), ...datos, fechaConstitucion: fecha })
    expect(body.fechaConstitucion).toBe('2000-11-05')
    expect(() => datosCrearEntidad({ ...valoresEntidadInicial(), ...datos, fechaConstitucion: fechaDesdePartes({ dia: '31', mes: '04', anio: '2000' }) })).toThrow()
  })

  it('envía POST a la ruta confirmada y acepta solo 201 con entidad válida', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue(respuesta(persistida))
    expect(await crearEntidad(datos)).toEqual(persistida)
    expect(post).toHaveBeenCalledWith('/api/v1/organizacion/entidad', datos)
  })

  it.each([respuesta(persistida, 200), respuesta('<html>error</html>'), respuesta({ idEntidad: 1 })])('no confirma una respuesta ajena al contrato', async r => {
    vi.spyOn(apiClient, 'post').mockResolvedValue(r)
    await expect(crearEntidad(datos)).rejects.toMatchObject({ code: 'respuesta_invalida' })
  })

  it('preserva el conflicto de entidad existente para recuperar por GET sin sobrescribir', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(new ApiError('Existe', 409, 'ENTIDAD_YA_EXISTE'))
    await expect(crearEntidad(datos)).rejects.toMatchObject({ status: 409, code: 'ENTIDAD_YA_EXISTE' })
  })
})

describe('Existencia confirmada por GET', () => {
  it('devuelve entidad existente, también inactiva', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue(respuesta({ ...persistida, estado: 'I' }, 200))
    expect((await consultarExistenciaEntidad())?.estado).toBe('I')
  })
  it('solo interpreta ENTIDAD_NO_ENCONTRADA como ausencia', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue(new ApiError('Sin entidad', 404, 'ENTIDAD_NO_ENCONTRADA'))
    expect(await consultarExistenciaEntidad()).toBeNull()
  })
  it.each([[404, 'OTRO_404'], [401, 'NO_AUTENTICADO'], [403, 'SIN_PERMISO'], [500, 'ERROR'], [null, 'network_error']] as const)('no habilita alta por error %s', async (status, code) => {
    vi.spyOn(apiClient, 'get').mockRejectedValue(new ApiError('Error', status, code))
    await expect(consultarExistenciaEntidad()).rejects.toMatchObject({ status, code })
  })
})
