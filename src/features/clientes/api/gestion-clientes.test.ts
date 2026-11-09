import { AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiClient } from '@/shared/api'
import { cambiarEstadoCliente, clienteUpdateSchema, editarCliente, estadoUpdateSchema, obtenerHistorial } from '@/features/clientes/api/gestion-clientes'

const cliente = { idCliente: 1042, identificacion: '1710034065', tipoDocumento: 'C', tipoCliente: 'Natural', nombres: 'María', apellidos: 'Pérez', razonSocial: null,
  nombreComercial: null, estadoCivil: 'Soltero', idActividadEconomica: 1, estado: 'Activo', email: 'maria@example.test', telefonoCelular: '0991234567', telefonoConvencional: null,
  fechaNacimiento: '1992-05-14', fechaRegistro: '2026-11-06T10:00:00Z', direcciones: [] }
const respuesta = (data: unknown) => ({ data, status: 200, statusText: 'OK', headers: {}, config: { headers: new AxiosHeaders() } })
afterEach(() => vi.restoreAllMocks())

describe('contrato de edición parcial', () => {
  it('omitir conserva y null permite borrar solo campos anulables', () => {
    expect(clienteUpdateSchema.parse({ telefonoConvencional: null })).toEqual({ telefonoConvencional: null })
    expect(clienteUpdateSchema.safeParse({ nombres: null }).success).toBe(false)
    expect(clienteUpdateSchema.safeParse({ telefonoCelular: null }).success).toBe(false)
    expect(clienteUpdateSchema.safeParse({ email: null }).success).toBe(false)
  })
  it.each(['identificacion', 'tipoCliente', 'tipoDocumento', 'fechaNacimiento', 'genero', 'estado', 'creadoPor'])('rechaza el campo protegido %s', (campo) => {
    expect(clienteUpdateSchema.safeParse({ email: 'nuevo@example.test', [campo]: 'alterado' }).success).toBe(false)
  })
  it('rechaza cambios vacíos, nombres en blanco y correo inválido', () => {
    for (const datos of [{}, { nombres: '   ' }, { email: 'sin-arroba' }]) expect(clienteUpdateSchema.safeParse(datos).success).toBe(false)
  })
  it('envía solamente el patch solicitado y valida la ficha devuelta', async () => {
    const llamada = vi.spyOn(apiClient, 'patch').mockResolvedValue(respuesta({ ...cliente, email: 'nuevo@example.test' }))
    await expect(editarCliente(1042, { email: 'nuevo@example.test' })).resolves.toMatchObject({ email: 'nuevo@example.test' })
    expect(llamada).toHaveBeenCalledWith('/api/v1/clientes/1042', { email: 'nuevo@example.test' })
  })
  it('rechaza un HTML 200 en lugar de dar por guardado el cambio', async () => {
    vi.spyOn(apiClient, 'patch').mockResolvedValue(respuesta('<html></html>'))
    await expect(editarCliente(1042, { email: 'nuevo@example.test' })).rejects.toMatchObject({ code: 'respuesta_invalida' })
  })
})

describe('estado y consulta de historial', () => {
  it('exige motivo no vacío de hasta 500 caracteres y destino válido', () => {
    for (const datos of [{ estado: 'Inactivo', motivo: ' ' }, { estado: 'Activo', motivo: 'x'.repeat(501) }, { estado: 'Pendiente', motivo: 'Cambio' }]) {
      expect(estadoUpdateSchema.safeParse(datos).success).toBe(false)
    }
  })
  it('envía el motivo recortado al endpoint de estado', async () => {
    const llamada = vi.spyOn(apiClient, 'patch').mockResolvedValue(respuesta({ ...cliente, estado: 'Bloqueado' }))
    await cambiarEstadoCliente(1042, 'Bloqueado', '  Solicitud del cliente  ')
    expect(llamada).toHaveBeenCalledWith('/api/v1/clientes/1042/estado', { estado: 'Bloqueado', motivo: 'Solicitud del cliente' })
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
