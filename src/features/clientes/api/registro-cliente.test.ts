import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiClient } from '@/shared/api'
import { aClienteCreate, errorRegistro, registrarCliente } from '@/features/clientes/api/registro-cliente'
import { actividadSchema, DATOS_CLIENTE_VACIOS, datosClienteSchema, direccionesSchema } from '@/features/clientes/schemas/registro-cliente.schema'

const entrada = { ...DATOS_CLIENTE_VACIOS, identificacion: '1710034065', nombres: 'María', apellidos: 'Prueba', fechaNacimiento: '1992-05-14', genero: 'F', estadoCivil: 'UNION_HECHO', telefonoCelular: '991234567', email: 'maria@example.test' }
const direccion = { tipoDireccion: 'CORRESPONDENCIA', codigoPais: 'COL', provincia: 'Cundinamarca', idCiudad: '3', sector: '', calleDireccion: 'Calle de prueba 123', referenciaUbicacion: 'Frente al parque', codigoPostal: '', esPrincipal: true }
const registro = {
  cliente: { ...datosClienteSchema.parse(entrada), ...actividadSchema.parse({ idActividadEconomica: '1', consentimientoDatos: true }) },
  direcciones: direccionesSchema.parse({ direcciones: [direccion] }).direcciones,
}
const respuesta = { ...aClienteCreate(registro), idCliente: 2001, estado: 'Pendiente', nombreComercial: null, fechaRegistro: '2026-11-09T18:00:00Z', direcciones: [{ ...aClienteCreate(registro).direccion, idDireccion: 1 }] }
afterEach(() => vi.restoreAllMocks())

describe('C-01 · adaptación al contrato', () => {
  it('envía un body plano Natural/C con una principal y conserva país extranjero', () => {
    const payload = aClienteCreate(registro)
    expect(payload).toMatchObject({ tipoCliente: 'Natural', tipoDocumento: 'C', estadoCivil: 'Union Libre', telefonoCelular: '+593991234567', direccion: { codigoPais: 'COL', idCiudad: 3, tipoDireccion: 'Correspondencia', esPrincipal: true } })
    for (const campo of ['cliente', 'direcciones', 'estado', 'creadoPor', 'fechaRegistro', 'fechaConsentimiento', 'idCliente']) expect(payload).not.toHaveProperty(campo)
    expect(payload.direccion).not.toHaveProperty('provincia')
  })
  it('no inventa datos para empresas', () => {
    expect(() => aClienteCreate({ ...registro, cliente: { ...registro.cliente, tipoCliente: 'JURIDICO' } })).toThrow('empresas')
  })
  it.each([[], [...registro.direcciones, ...registro.direcciones], [{ ...registro.direcciones[0], esPrincipal: false }]].map((direcciones) => ({ direcciones })))('no pierde ni guarda parcialmente direcciones', ({ direcciones }) => {
    expect(() => aClienteCreate({ ...registro, direcciones })).toThrow('principal')
  })
  it('rechaza valores de género o dirección no admitidos por backend', () => {
    expect(() => aClienteCreate({ ...registro, cliente: { ...registro.cliente, genero: 'O' } })).toThrow()
    expect(() => aClienteCreate({ ...registro, direcciones: [{ ...registro.direcciones[0], tipoDireccion: 'NEGOCIO' }] })).toThrow()
  })
  it('el formulario limita el alta a una dirección y conserva su país', () => {
    expect(direccionesSchema.safeParse({ direcciones: [direccion, direccion] }).success).toBe(false)
    expect(registro.direcciones[0].codigoPais).toBe('COL')
  })
})

describe('C-01 · confirmación de guardado', () => {
  it('registra pasaporte como P sin alterar el número ni la dirección extranjera', async () => {
    const conPasaporte = { ...registro, cliente: { ...registro.cliente, tipoDocumento: 'PASAPORTE', identificacion: 'AB1234567' } }
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ status: 201, data: { ...respuesta, tipoDocumento: 'P', identificacion: 'AB1234567' } })
    expect(await registrarCliente(conPasaporte)).toMatchObject({ tipoDocumento: 'P', identificacion: 'AB1234567' })
    expect(post.mock.calls[0][1]).toMatchObject({ tipoDocumento: 'P', identificacion: 'AB1234567', codigoPaisNacionalidad: 'ECU', direccion: { codigoPais: 'COL' } })
  })
  it('rechaza una respuesta que cambia el tipo de documento enviado', async () => {
    const conPasaporte = { ...registro, cliente: { ...registro.cliente, tipoDocumento: 'PASAPORTE', identificacion: 'AB1234567' } }
    vi.spyOn(apiClient, 'post').mockResolvedValue({ status: 201, data: { ...respuesta, identificacion: 'AB1234567', tipoDocumento: 'C' } })
    await expect(registrarCliente(conPasaporte)).rejects.toMatchObject({ code: 'registro_sin_confirmar' })
  })
  it('envía un solo POST y usa id/estado devueltos por el servidor', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ status: 201, data: respuesta })
    expect(await registrarCliente(registro)).toMatchObject({ idCliente: 2001, estado: 'Pendiente' })
    expect(post).toHaveBeenCalledExactlyOnceWith('/api/v1/clientes', aClienteCreate(registro))
  })
  it.each([[201, '<html>'], [200, respuesta], [201, { ...respuesta, identificacion: 'otra' }], [201, { ...respuesta, idCliente: 0 }]])('no anuncia éxito sin confirmación válida', async (status, data) => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({ status, data })
    await expect(registrarCliente(registro)).rejects.toMatchObject({ code: 'registro_sin_confirmar' })
  })
  it('conserva el conflicto de duplicado sin repetir POST', async () => {
    const post = vi.spyOn(apiClient, 'post').mockRejectedValue(new ApiError('Duplicado', 409, 'CLIENTE_DUPLICADO'))
    await expect(registrarCliente(registro)).rejects.toMatchObject({ status: 409, code: 'CLIENTE_DUPLICADO' })
    expect(post).toHaveBeenCalledTimes(1)
    expect(errorRegistro(new ApiError('', 409, 'CLIENTE_DUPLICADO'))).toContain('Ya existe')
  })
  it('distingue permisos y guardado incierto', () => {
    expect(errorRegistro(new ApiError('', 403, 'SIN_PERMISO'))).toContain('ASESOR o ADMIN')
    expect(errorRegistro(new ApiError('', null, 'network_error'))).toContain('Consulta la identificación antes de reenviar')
  })
  it('no envía datos que no cumplen el contrato ni confunde validación con fallo de red', async () => {
    expect.assertions(3)
    const post = vi.spyOn(apiClient, 'post')
    try { aClienteCreate({ ...registro, cliente: { ...registro.cliente, consentimientoDatos: false } }) } catch (error) {
      expect(errorRegistro(error)).toContain('No se envió el registro')
    }
    await expect(registrarCliente({ ...registro, cliente: { ...registro.cliente, genero: 'O' } })).rejects.toThrow()
    expect(post).not.toHaveBeenCalled()
  })
})
