import { AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { apiClient } from '@/shared/api'
import { actualizarAgencia, crearAgencia } from '@/features/organizacion/api/agencias.api'
import { agenciaDetalleSchema } from '@/features/organizacion/api/agencias.contract'

const agencia = {
  idAgencia: '002',
  codigo: 'SUC-NORTE',
  tipoAgencia: 'Sucursal',
  estado: 'A',
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
  it('ORG-01 envía el body a /api/v1/agencias y valida la respuesta', async () => {
    const body = { codigo: 'SUC-NORTE', tipoAgencia: 'Sucursal', idCiudad: 17 } as const
    const llamada = vi.spyOn(apiClient, 'post').mockResolvedValue(respuesta(agencia, 201))
    await expect(crearAgencia(body)).resolves.toEqual(agencia)
    expect(llamada).toHaveBeenCalledWith('/api/v1/agencias', body)
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

  it('ORG-02 usa PATCH sobre la agencia', async () => {
    const llamada = vi.spyOn(apiClient, 'patch').mockResolvedValue(respuesta({ ...agencia, estado: 'I' }))
    await actualizarAgencia('002', { estado: 'I', motivo: 'Cierre temporal' })
    expect(llamada).toHaveBeenCalledWith('/api/v1/agencias/002', { estado: 'I', motivo: 'Cierre temporal' })
  })

  it('rechaza un 200 que no es una agencia', async () => {
    vi.spyOn(apiClient, 'patch').mockResolvedValue(respuesta('<!doctype html>'))
    await expect(actualizarAgencia('002', { codigo: 'X' })).rejects.toMatchObject({ code: 'respuesta_invalida' })
  })
})
