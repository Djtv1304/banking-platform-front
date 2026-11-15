import { describe, expect, it } from 'vitest'

import { cuposBody, entradasCupos, restriccionesBody } from '@/features/organizacion/lib/cupos-form'

const ventanilla = {
  idCanal: 1,
  habilitado: true,
  cupoDiarioMaximo: '10000',
  cupoMensualMaximo: '50000',
  montoMaxTransaccion: '5000',
  maxTransaccionesDia: '10',
}

describe('cupos por canal', () => {
  it('solo los canales marcados van al backend, como números', () => {
    expect(cuposBody([ventanilla, { ...ventanilla, idCanal: 2, habilitado: false }])).toEqual({
      body: [{ idCanal: 1, cupoDiarioMaximo: 10000, cupoMensualMaximo: 50000, montoMaxTransaccion: 5000, maxTransaccionesDia: 10 }],
    })
  })

  it('aplica las mismas reglas que la tabla', () => {
    expect(cuposBody([{ ...ventanilla, cupoMensualMaximo: '100' }])).toEqual({
      errores: { 1: { cupoMensualMaximo: 'Debe ser mayor o igual que el diario.' } },
    })
    expect(cuposBody([{ ...ventanilla, montoMaxTransaccion: '20000' }])).toHaveProperty('errores')
    expect(cuposBody([{ ...ventanilla, maxTransaccionesDia: '0' }])).toHaveProperty('errores')
    expect(cuposBody([{ ...ventanilla, cupoDiarioMaximo: '1,000' }])).toHaveProperty('errores')
  })

  it('un canal sin configurar empieza vacío y desmarcado', () => {
    expect(entradasCupos([{ idCanal: 2, codigoCanal: 'ATM', nombreCanal: 'Cajero', habilitado: false }])[0]).toMatchObject({
      habilitado: false,
      cupoDiarioMaximo: '',
    })
  })
})

describe('restricciones de cuenta', () => {
  it('vacío es sin restricción', () => {
    expect(restriccionesBody({ diasSinRetiros: '', saldoMinimo: '100' })).toEqual({ body: { diasSinRetiros: null, saldoMinimo: 100 } })
    expect(restriccionesBody({ diasSinRetiros: '0', saldoMinimo: '' })).toHaveProperty('errores')
    expect(restriccionesBody({ diasSinRetiros: '30', saldoMinimo: '-1' })).toHaveProperty('errores')
  })
})
