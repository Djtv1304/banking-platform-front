import { afterEach, describe, expect, it, vi } from 'vitest'
import { AxiosHeaders } from 'axios'
import { QueryClient } from '@tanstack/react-query'
import { ApiError, apiClient } from '@/shared/api'
import { accesoEntidad, editarEntidad, ENTIDAD_KEY, entidadPatchSchema, entidadSchema, mensajeErrorEntidad, obtenerEntidad } from '@/features/organizacion/api/entidad'
import { cambiosEntidad, entidadFormSchema, fechaEntidad, valoresEntidad } from '@/features/organizacion/lib/entidad-form'
import { confirmarEntidadEnCache } from '@/features/organizacion/hooks/useEntidad'

const entidad = {
  idEntidad: 1 as const, ruc: '1790000000001', razonSocial: 'Cooperativa Ficticia Enquo', nombreComercial: 'Enquo Demo',
  tipoOrganizacion: 'Cooperativa de Ahorro y Credito', segmento: 2, numeroResolucionSeps: 'DEMO-001',
  fechaConstitucion: '2000-01-15', representanteLegal: 'Representante Ficticio', identificacionRepresentante: 'DEMO12345',
  telefono: '022000000', email: 'institucion@example.test', sitioWeb: 'https://example.test', estado: 'A' as const,
  fechaRegistro: '2026-11-12T12:00:00', modificadoPor: 1,
}
const respuesta = (data: unknown, status = 200) => ({ data, status, statusText: 'OK', headers: {}, config: { headers: new AxiosHeaders() } })
afterEach(() => vi.restoreAllMocks())

describe('Entidad · permisos y contrato #323', () => {
  it('separa la consulta de ASESOR de la edición de ADMIN y deniega otros roles', () => {
    expect(accesoEntidad([' admin '])).toEqual({ consulta: true, edicion: true })
    expect(accesoEntidad(['ASESOR'])).toEqual({ consulta: true, edicion: false })
    for (const rol of ['AUDITOR', 'SUPERVISOR', 'CAJERO', 'member']) expect(accesoEntidad([rol])).toEqual({ consulta: false, edicion: false })
    expect(accesoEntidad([])).toEqual({ consulta: false, edicion: false })
  })
  it('acepta campos opcionales nulos y ambas formas de fecha de registro', () => {
    expect(entidadSchema.parse({ ...entidad, email: null, segmento: null }).email).toBeNull()
    expect(entidadSchema.safeParse({ ...entidad, fechaRegistro: '2026-11-12T12:00:00Z' }).success).toBe(true)
    expect(entidadSchema.safeParse({ ...entidad, idEntidad: 2 }).success).toBe(false)
  })
  it('consulta la ruta prevista con cancelación', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue(respuesta(entidad))
    const signal = new AbortController().signal
    expect(await obtenerEntidad(signal)).toEqual(entidad)
    expect(get).toHaveBeenCalledWith('/api/v1/organizacion/entidad', { signal })
  })
  it('conserva el 404 específico para distinguir configuración ausente', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue(new ApiError('Sin entidad', 404, 'ENTIDAD_NO_ENCONTRADA'))
    await expect(obtenerEntidad()).rejects.toMatchObject({ status: 404, code: 'ENTIDAD_NO_ENCONTRADA' })
  })
  it('rechaza HTML o JSON incompleto en consultas', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce(respuesta('<html>503</html>')).mockResolvedValueOnce(respuesta({ idEntidad: 1 }))
    await expect(obtenerEntidad()).rejects.toMatchObject({ code: 'respuesta_invalida' })
    await expect(obtenerEntidad()).rejects.toMatchObject({ code: 'respuesta_invalida' })
  })
  it('envía un PATCH parcial y usa la respuesta persistida', async () => {
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue(respuesta({ ...entidad, telefono: null }))
    expect((await editarEntidad({ telefono: null })).telefono).toBeNull()
    expect(patch).toHaveBeenCalledWith('/api/v1/organizacion/entidad', { telefono: null })
  })
  it.each(['estado', 'idEntidad', 'modificadoPor', 'fechaRegistro'])('no envía el campo protegido %s desde esta pantalla', async (key) => {
    const patch = vi.spyOn(apiClient, 'patch')
    await expect(editarEntidad({ telefono: null, [key]: 'alterado' })).rejects.toThrow()
    expect(patch).not.toHaveBeenCalled()
  })
  it('no envía un PATCH vacío ni anula un campo obligatorio', async () => {
    const patch = vi.spyOn(apiClient, 'patch')
    await expect(editarEntidad({})).rejects.toThrow()
    expect(entidadPatchSchema.safeParse({ razonSocial: null }).success).toBe(false)
    expect(patch).not.toHaveBeenCalled()
  })
  it('rechaza una confirmación inválida y no reintenta el guardado automáticamente', async () => {
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValueOnce(respuesta('<html>OK</html>')).mockRejectedValueOnce(new ApiError('Fallo', 503, 'ERROR'))
    await expect(editarEntidad({ nombreComercial: 'Prueba' })).rejects.toMatchObject({ code: 'respuesta_invalida' })
    await expect(editarEntidad({ nombreComercial: 'Prueba' })).rejects.toMatchObject({ status: 503 })
    expect(patch).toHaveBeenCalledTimes(2)
  })
})

describe('Entidad · formulario y cambios parciales', () => {
  it('representa NULL con campos vacíos sin enviar cambios al abrir y guardar', () => {
    const original = { ...entidad, telefono: null, sitioWeb: '', segmento: null }
    expect(cambiosEntidad(original, valoresEntidad(original))).toEqual({})
  })
  it('envía únicamente el campo editado y convierte vacíos opcionales a null', () => {
    expect(cambiosEntidad(entidad, { ...valoresEntidad(entidad), nombreComercial: 'Nuevo' })).toEqual({ nombreComercial: 'Nuevo' })
    expect(cambiosEntidad(entidad, { ...valoresEntidad(entidad), telefono: '', segmento: '' })).toEqual({ telefono: null, segmento: null })
    expect(cambiosEntidad(entidad, { ...valoresEntidad(entidad), segmento: '3' })).toEqual({ segmento: 3 })
  })
  it('recorta textos editados y mantiene las fechas civiles sin desfase horario', () => {
    expect(cambiosEntidad(entidad, { ...valoresEntidad(entidad), nombreComercial: '  Nuevo  ' })).toEqual({ nombreComercial: 'Nuevo' })
    expect(fechaEntidad('2000-01-15')).toBe('15/01/2000')
    expect(fechaEntidad('2026-11-12T12:00:00')).toContain('sin zona informada')
  })
  it.each([
    ['razonSocial', ' '], ['ruc', '1790000000002'], ['segmento', '6'], ['fechaConstitucion', '2000-02-30'],
    ['identificacionRepresentante', 'abc!'], ['email', 'sin-arroba'], ['sitioWeb', 'javascript:alert(1)'], ['telefono', 'abcdef'],
  ])('rechaza %s inválido', (key, value) => {
    expect(entidadFormSchema.safeParse({ ...valoresEntidad(entidad), [key]: value }).success).toBe(false)
  })
  it('permite borrar todos los contactos opcionales', () => {
    expect(entidadFormSchema.safeParse({ ...valoresEntidad(entidad), telefono: '', email: '', sitioWeb: '' }).success).toBe(true)
  })
  it('normaliza la identificación del representante antes de validarla y construir el PATCH', () => {
    const formulario = { ...valoresEntidad(entidad), identificacionRepresentante: ' ab12345 ' }
    expect(entidadFormSchema.parse(formulario).identificacionRepresentante).toBe('AB12345')
    expect(cambiosEntidad(entidad, formulario)).toEqual({ identificacionRepresentante: 'AB12345' })
  })
  it('no cambia la capitalización del nombre del representante ni reenvía un identificador equivalente', () => {
    const formulario = { ...valoresEntidad(entidad), identificacionRepresentante: 'demo12345', representanteLegal: 'Ana de la Cruz' }
    expect(cambiosEntidad(entidad, formulario)).toEqual({ representanteLegal: 'Ana de la Cruz' })
  })
  it('explica que un error de guardado conserva el borrador', () => {
    expect(mensajeErrorEntidad(new ApiError('Fallo', 503, 'ERROR'), true)).toContain('borrador se conserva')
    expect(mensajeErrorEntidad(new ApiError('Fallo', 403, 'SIN_PERMISO'), true)).toContain('No tienes permiso')
  })
})

describe('Entidad · caché después de editar', () => {
  it('la respuesta persistida reemplaza la ficha conservando las demás consultas', async () => {
    const cache = new QueryClient()
    cache.setQueryData(ENTIDAD_KEY, entidad)
    cache.setQueryData(['catalogos', 'agencias'], ['Matriz'])
    const actualizada = { ...entidad, nombreComercial: 'Nombre confirmado' }
    await confirmarEntidadEnCache(cache, actualizada)
    expect(cache.getQueryData(ENTIDAD_KEY)).toEqual(actualizada)
    expect(cache.getQueryData(['catalogos', 'agencias'])).toEqual(['Matriz'])
    cache.clear()
  })
  it('una lectura anterior que llega tarde no sobrescribe el guardado confirmado', async () => {
    const cache = new QueryClient()
    let resolver!: (value: typeof entidad) => void
    const pendiente = cache.fetchQuery({ queryKey: ENTIDAD_KEY, queryFn: () => new Promise<typeof entidad>((resolve) => { resolver = resolve }) }).catch(() => undefined)
    const actualizada = { ...entidad, nombreComercial: 'Dato recién guardado' }
    await confirmarEntidadEnCache(cache, actualizada)
    resolver(entidad)
    await pendiente
    expect(cache.getQueryData(ENTIDAD_KEY)).toEqual(actualizada)
    cache.clear()
  })
})
