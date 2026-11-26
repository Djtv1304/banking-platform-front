import { AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiClient } from '@/shared/api'
import { cambiarEstadoCliente, clienteUpdateSchema, editarCliente, estadoUpdateSchema, obtenerHistorial } from '@/features/clientes/api/gestion-clientes'

const cliente = { idCliente: 1042, identificacion: '1710034065', tipoDocumento: 'C', tipoCliente: 'Natural', nombres: 'María', apellidos: 'Pérez', razonSocial: null,
  nombreComercial: null, estadoCivil: 'Soltero', idActividadEconomica: 1, estado: 'Activo', email: 'maria@example.test', telefonoCelular: '0991234567', telefonoConvencional: null,
  fechaNacimiento: '1992-05-14', fechaRegistro: '2026-11-06T10:00:00Z', direcciones: [], motivoEstado: null }
const respuesta = (data: unknown) => ({ data, status: 200, statusText: 'OK', headers: {}, config: { headers: new AxiosHeaders() } })
afterEach(() => vi.restoreAllMocks())

describe('contrato de edición parcial', () => {
  it('omitir conserva y null permite borrar solo campos anulables', () => {
    expect(clienteUpdateSchema.parse({ telefonoConvencional: null })).toEqual({ telefonoConvencional: null })
    expect(clienteUpdateSchema.safeParse({ nombres: null }).success).toBe(false)
    expect(clienteUpdateSchema.safeParse({ telefonoCelular: null }).success).toBe(false)
    expect(clienteUpdateSchema.safeParse({ email: null }).success).toBe(false)
  })
  it.each(['tipoCliente', 'genero', 'estado', 'creadoPor', 'idArchivoRespaldo'])('rechaza el campo protegido %s', (campo) => {
    expect(clienteUpdateSchema.safeParse({ telefonoCelular: '0987654321', [campo]: 'alterado' }).success).toBe(false)
  })
  it('rechaza cambios vacíos, nombres en blanco y correo inválido', () => {
    for (const datos of [{}, { nombres: '   ' }, { email: 'sin-arroba' }]) expect(clienteUpdateSchema.safeParse(datos).success).toBe(false)
  })
  it('envía solamente el patch solicitado y valida la ficha devuelta', async () => {
    const llamada = vi.spyOn(apiClient, 'patch').mockResolvedValue(respuesta({ ...cliente, telefonoCelular: '0987654321' }))
    await expect(editarCliente(1042, { telefonoCelular: '0987654321' })).resolves.toMatchObject({ tipo: 'cliente', cliente: { telefonoCelular: '0987654321', emailVerificado: false } })
    expect(llamada).toHaveBeenCalledWith('/api/v1/clientes/1042', { telefonoCelular: '0987654321' })
  })
  it('rechaza un HTML 200 en lugar de dar por guardado el cambio', async () => {
    vi.spyOn(apiClient, 'patch').mockResolvedValue(respuesta('<html></html>'))
    await expect(editarCliente(1042, { telefonoCelular: '0987654321' })).rejects.toMatchObject({ code: 'respuesta_invalida' })
  })
  it('E5-04: un cambio sensible responde 202 con la solicitud y el cliente no cambia', async () => {
    const llamada = vi.spyOn(apiClient, 'patch').mockResolvedValue({ ...respuesta({ idSolicitud: 77, estado: 'Pendiente', requiereAprobacion: true }), status: 202 })
    await expect(editarCliente(1042, { apellidos: 'Andrade', email: 'Nuevo@Example.TEST' })).resolves.toEqual({ tipo: 'solicitud', idSolicitud: 77 })
    expect(llamada).toHaveBeenCalledWith('/api/v1/clientes/1042', { apellidos: 'Andrade', email: 'nuevo@example.test' })
  })
  it('E5-04: un 202 sin la forma de la cola no se da por aceptado', async () => {
    vi.spyOn(apiClient, 'patch').mockResolvedValue({ ...respuesta({ idSolicitud: 0 }), status: 202 })
    await expect(editarCliente(1042, { apellidos: 'Andrade' })).rejects.toMatchObject({ code: 'respuesta_invalida' })
  })
  it('E5-04: no mezcla datos ordinarios y sensibles en una petición', () => {
    expect(clienteUpdateSchema.safeParse({ apellidos: 'Andrade', telefonoCelular: '0987654321' }).success).toBe(false)
    expect(clienteUpdateSchema.safeParse({ identificacion: '1710034065', tipoDocumento: 'C', fechaNacimiento: '1990-01-02' }).success).toBe(true)
    expect(clienteUpdateSchema.safeParse({ fechaNacimiento: '02/01/1990' }).success).toBe(false)
  })
  it('E5-04: el conflicto por cambio pendiente llega tal cual para explicarlo', async () => {
    const error = new ApiError('El cliente ya tiene un cambio sensible pendiente de aprobación.', 409, 'CAMBIO_PENDIENTE')
    vi.spyOn(apiClient, 'patch').mockRejectedValue(error)
    await expect(editarCliente(1042, { apellidos: 'Otro' })).rejects.toBe(error)
  })
})

describe('estado y consulta de historial', () => {
  it('exige motivo no vacío de hasta 300 caracteres y destino válido', () => {
    for (const datos of [{ estado: 'Inactivo', motivo: ' ' }, { estado: 'Activo', motivo: 'x'.repeat(301) }, { estado: 'Pendiente', motivo: 'Cambio' }]) {
      expect(estadoUpdateSchema.safeParse(datos).success).toBe(false)
    }
    expect(estadoUpdateSchema.safeParse({ estado: 'Activo', motivo: 'x'.repeat(300) }).success).toBe(true)
  })
  it('envía el motivo recortado al endpoint de estado y devuelve 200 con cliente y motivoEstado', async () => {
    const llamada = vi.spyOn(apiClient, 'patch').mockResolvedValue(respuesta({ ...cliente, estado: 'Inactivo', motivoEstado: 'Solicitud del cliente' }))
    const res = await cambiarEstadoCliente(1042, 'Inactivo', '  Solicitud del cliente  ')
    expect(llamada).toHaveBeenCalledWith('/api/v1/clientes/1042/estado', { estado: 'Inactivo', motivo: 'Solicitud del cliente' })
    expect(res).toEqual({ tipo: 'cliente', cliente: expect.objectContaining({ estado: 'Inactivo', motivoEstado: 'Solicitud del cliente' }) })
  })
  it('E5-07: cambio de estado que requiere aprobación responde 202 con la solicitud', async () => {
    const llamada = vi.spyOn(apiClient, 'patch').mockResolvedValue({ ...respuesta({ idSolicitud: 88, estado: 'Pendiente', requiereAprobacion: true }), status: 202 })
    const res = await cambiarEstadoCliente(1042, 'Bloqueado', 'Cliente moroso')
    expect(llamada).toHaveBeenCalledWith('/api/v1/clientes/1042/estado', { estado: 'Bloqueado', motivo: 'Cliente moroso' })
    expect(res).toEqual({ tipo: 'solicitud', idSolicitud: 88 })
  })
  it('E5-07: rechaza respuesta inválida del servidor al cambiar estado', async () => {
    vi.spyOn(apiClient, 'patch').mockResolvedValue(respuesta('<html></html>'))
    await expect(cambiarEstadoCliente(1042, 'Inactivo', 'Solicitud')).rejects.toMatchObject({ code: 'respuesta_invalida' })
  })
  it('conserva el conflicto por productos vigentes para explicarlo al usuario', async () => {
    const error = new ApiError('El cliente conserva cuentas vigentes.', 409, 'CLIENTE_CON_PRODUCTOS_VIGENTES')
    vi.spyOn(apiClient, 'patch').mockRejectedValue(error)
    await expect(cambiarEstadoCliente(1043, 'Inactivo', 'Solicitud')).rejects.toBe(error)
  })
  it('consulta historial paginado de solo lectura', async () => {
    const llamada = vi.spyOn(apiClient, 'get').mockResolvedValue(respuesta({ items: [], page: 2, pageSize: 20, total: 21 }))
    await expect(obtenerHistorial(1042, 2)).resolves.toMatchObject({ page: 2, total: 21 })
    expect(llamada.mock.calls[0][0]).toBe('/api/v1/clientes/1042/historial')
    expect(llamada.mock.calls[0][1]?.params).toMatchObject({ page: 2, pageSize: 20, sort: 'fechaModificacion,desc' })
  })
})
