import { describe, expect, it } from 'vitest'

import { ejemplo, patronDeRuta, respuestaSimulada, type ContratoOpenApi } from '@/shared/api/contrato-ejemplo'

const CONTRATO: ContratoOpenApi = {
  paths: {
    '/api/v1/cuentas/{idCuenta}': {
      get: { responses: { '200': { content: { 'application/json': { schema: { $ref: '#/components/schemas/Cuenta' } } } } } },
    },
    '/api/v1/cuentas': { post: { responses: { '201': { content: { 'application/json': { schema: { $ref: '#/components/schemas/Cuenta' } } } } } } },
  },
  components: {
    schemas: {
      Cuenta: {
        type: 'object',
        properties: {
          idCuenta: { type: 'integer', minimum: 1 },
          estado: { type: 'string', enum: ['Activa', 'Bloqueada'] },
          saldo: { type: 'string', example: '150.00' },
          apertura: { type: 'string', format: 'date' },
          titular: { anyOf: [{ type: 'null' }, { $ref: '#/components/schemas/Persona' }] },
          movimientos: { type: 'array', items: { type: 'string' } },
        },
      },
      Persona: { type: 'object', properties: { nombre: { type: 'string' } } },
    },
  },
}

describe('modo contrato (E0-03)', () => {
  it('arma un ejemplo que cumple el esquema', () => {
    expect(ejemplo({ $ref: '#/components/schemas/Cuenta' }, CONTRATO.components?.schemas)).toEqual({
      idCuenta: 1,
      estado: 'Activa',
      saldo: '150.00',
      apertura: '2026-01-15',
      titular: { nombre: 'texto' },
      movimientos: ['texto'],
    })
  })

  it('responde la ruta del contrato con su código de éxito y nada fuera del contrato', () => {
    expect(respuestaSimulada([CONTRATO], 'GET', '/api/v1/cuentas/42')?.status).toBe(200)
    expect(respuestaSimulada([CONTRATO], 'POST', '/api/v1/cuentas')?.status).toBe(201)
    expect(respuestaSimulada([CONTRATO], 'DELETE', '/api/v1/cuentas/42')).toBeNull()
    expect(respuestaSimulada([CONTRATO], 'GET', '/api/v1/tarjetas')).toBeNull()
  })

  it('las plantillas de ruta solo aceptan un segmento por parámetro', () => {
    expect(patronDeRuta('/api/v1/cuentas/{idCuenta}').test('/api/v1/cuentas/7')).toBe(true)
    expect(patronDeRuta('/api/v1/cuentas/{idCuenta}').test('/api/v1/cuentas/7/movimientos')).toBe(false)
  })
})
