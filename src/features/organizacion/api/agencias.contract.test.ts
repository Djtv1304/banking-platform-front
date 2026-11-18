import { AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { apiClient } from '@/shared/api'
import { actualizarAgencia, cambiarEstadoAgencia, crearAgencia, listarAgencias } from '@/features/organizacion/api/agencias.api'
import { agenciaDetalleSchema } from '@/features/organizacion/api/agencias.contract'

const agencia = {
  idAgencia: '002',
  codigo: 'SUC-NORTE',
  tipoAgencia: 'Sucursal',
  estado: 'I',
  idCiudad: 17,
  telefono: null,
  direccion: 'Av. Amazonas y Naciones Unidas',
  fechaCreacion: '2026-11-12T10:30:00-05:00',
  vinculadaWorkos: false,
}

const respuesta = (data: unknown, status = 200) => ({
  data,
  status,
  statusText: 'OK',
  headers: {},
  config: { headers: new AxiosHeaders() },
})

afterEach(() => vi.restoreAllMocks())

describe('agenciaDetalleSchema', () => {
  it('lee la respuesta de ORG-01/ORG-02 con opcionales en null', () => {
    expect(agenciaDetalleSchema.parse(agencia)).toEqual(agencia)
  })

  it('rechaza un estado o un tipo que el backend no define', () => {
    expect(agenciaDetalleSchema.safeParse({ ...agencia, estado: 'X' }).success).toBe(false)
    expect(agenciaDetalleSchema.safeParse({ ...agencia, tipoAgencia: 'Oficina' }).success).toBe(false)
  })
})

describe('API de agencias', () => {
  it('ORG-01 envía el body a /api/v1/organizacion/agencias y valida la respuesta', async () => {
    const body = { codigo: 'SUC-NORTE', tipoAgencia: 'Sucursal', idCiudad: 17 } as const
    const llamada = vi.spyOn(apiClient, 'post').mockResolvedValue(respuesta(agencia, 201))
    await expect(crearAgencia(body)).resolves.toEqual(agencia)
    expect(llamada).toHaveBeenCalledWith('/api/v1/organizacion/agencias', body)
  })

  it('conserva el ID con ceros asignado por backend aunque no se haya enviado en el POST', async () => {
    const body = { codigo: 'SUC-ESTE', tipoAgencia: 'Sucursal', idCiudad: 17 } as const
    const creada = { ...agencia, idAgencia: '007', codigo: body.codigo }
    vi.spyOn(apiClient, 'post').mockResolvedValue(respuesta(creada, 201))
    const resultado = await crearAgencia(body)
    expect(resultado.idAgencia).toBe('007')
    expect(resultado.codigo).toBe('SUC-ESTE')
  })

  it('no acepta una respuesta de creación sin ID asignado', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue(respuesta({ ...agencia, idAgencia: '' }, 201))
    await expect(crearAgencia({ codigo: 'SUC-ESTE', tipoAgencia: 'Sucursal', idCiudad: 17 })).rejects.toMatchObject({ code: 'respuesta_invalida' })
  })

  it('usa rutas separadas para editar datos y activar', async () => {
    const llamada = vi.spyOn(apiClient, 'patch').mockResolvedValue(respuesta({ ...agencia, codigo: 'NORTE' }))
    await actualizarAgencia('002', { codigo: 'NORTE' })
    expect(llamada).toHaveBeenCalledWith('/api/v1/organizacion/agencias/002', { codigo: 'NORTE' })
    llamada.mockResolvedValue(respuesta({ idAgencia: '002', estado: 'A' }))
    await expect(cambiarEstadoAgencia('002', { estado: 'A', motivo: 'Apertura' })).resolves.toEqual({ idAgencia: '002', estado: 'A' })
    expect(llamada).toHaveBeenLastCalledWith('/api/v1/organizacion/agencias/002/estado', { estado: 'A', motivo: 'Apertura' })
  })

  it('lee el listado administrativo con agencias activas e inactivas', async () => {
    const activasEInactivas = [agencia, { ...agencia, estado: 'A', idAgencia: '003' }]
    const llamada = vi.spyOn(apiClient, 'get').mockResolvedValue(respuesta(activasEInactivas))
    await expect(listarAgencias()).resolves.toEqual(activasEInactivas)
    expect(llamada).toHaveBeenCalledWith('/api/v1/organizacion/agencias', { signal: undefined })
  })

  it('valida el 202 con el contrato de E0-08 y rechaza un 202 sin idSolicitud', async () => {
    const aceptada = { idSolicitud: 42, estado: 'Pendiente', requiereAprobacion: true }
    const llamada = vi.spyOn(apiClient, 'patch').mockResolvedValue(respuesta(aceptada, 202))
    const body = { estado: 'I', motivo: 'Cierre temporal' } as const
    await expect(cambiarEstadoAgencia('002', body)).resolves.toEqual(aceptada)
    llamada.mockResolvedValue(respuesta(agencia, 202))
    await expect(cambiarEstadoAgencia('002', body)).rejects.toMatchObject({ code: 'respuesta_invalida' })
  })

  it('rechaza un 200 que no es una agencia', async () => {
    vi.spyOn(apiClient, 'patch').mockResolvedValue(respuesta('<!doctype html>'))
    await expect(actualizarAgencia('002', { codigo: 'X' })).rejects.toMatchObject({ code: 'respuesta_invalida' })
  })
})
