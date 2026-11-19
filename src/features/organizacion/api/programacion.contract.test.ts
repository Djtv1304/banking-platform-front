import { describe, expect, it } from 'vitest'
import { centavos, validarGrilla, solicitudProductoSchema, type EntradaCupoVigencia } from '@/features/organizacion/api/programacion.contract'

const fila: EntradaCupoVigencia = { idCanal: 1, codigoCanal: 'QA', nombreCanal: 'Canal de prueba', habilitado: true, cupoDiarioMaximo: '9007199254740991.01', cupoMensualMaximo: '9007199254740991.02', montoMaxTransaccion: '9007199254740991.00', maxTransaccionesDia: '10' }

describe('E3-03: validaciones exactas de cupos', () => {
  it('compara centavos sin perder precision por encima de Number.MAX_SAFE_INTEGER', () => {
    expect(centavos('9007199254740991.01')).toBe(900719925474099101n)
    expect(validarGrilla([fila])).toBeNull()
    expect(validarGrilla([{ ...fila, montoMaxTransaccion: '9007199254740991.02' }])).toContain('no puede superar')
  })
  it.each(['-1', '1.001', '1e4', 'NaN', '', ' 1', '1,25'])('rechaza el importe invalido %s', valor => {
    expect(centavos(valor)).toBeNull()
    expect(validarGrilla([{ ...fila, cupoDiarioMaximo: valor }])).not.toBeNull()
  })
  it('rechaza diario superior al mensual y cantidad fraccionaria', () => {
    expect(validarGrilla([{ ...fila, cupoMensualMaximo: '1' }])).toContain('no puede superar')
    expect(validarGrilla([{ ...fila, maxTransaccionesDia: '1.5' }])).not.toBeNull()
  })
  it('un canal deshabilitado no necesita importes inventados', () => {
    expect(validarGrilla([{ ...fila, habilitado: false, cupoDiarioMaximo: '' }])).toBeNull()
  })
})

describe('E3-03: historial de aprobaciones', () => {
  it('conserva la referencia de cancelacion sin exponer preimagenes internas', () => {
    const solicitud = solicitudProductoSchema.parse({ idSolicitud: 7, estado: 'Ejecutada', fecha: '2026-11-18T12:00:00Z', responsable: 'Persona QA(1)', clase: 'cupos', accion: 'cancelar', idOrigen: 6, _previos: [{ datoPrivado: true }] })
    expect(solicitud.idOrigen).toBe(6)
    expect(solicitud).not.toHaveProperty('_previos')
  })
})
