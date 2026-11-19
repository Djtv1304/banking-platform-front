import { describe, expect, it } from 'vitest'
import { cambiosMetadatos, resultadoComision, tarifaHistorica } from '@/features/parametros/api/comisiones.api'

describe('contrato de comisiones E1-12', () => {
  it('conserva el identificador de la aprobación devuelto por PATCH', () => {
    const respuesta = { idSolicitud: 123, estado: 'Pendiente', requiereAprobacion: true }
    expect(resultadoComision(202, respuesta)).toEqual({ tipo: 'solicitud', ...respuesta })
    expect(() => resultadoComision(200, respuesta)).toThrow()
    expect(() => resultadoComision(202, { idComision: 123 })).toThrow()
  })

  it('procesa la respuesta de una actualización directa', () => {
    const comision = {
      idComision: 1, codigoComision: 'RET', tipoComision: 'Retiro', tipoCalculo: 'Fijo',
      valor: 0.25, montoMinimo: null, montoMaximo: null, idCanal: 1, descripcion: 'Retiro',
      vigenciaDesde: '2026-11-19', vigenciaHasta: null, estado: 'A', idCuentaContableIngreso: null,
      asociaciones: [],
    }
    expect(resultadoComision(200, comision)).toEqual({ tipo: 'actualizada', comision })
  })

  it('conserva la precisión decimal de la tarifa consultada', () => {
    const tarifa = { idComision: 1, valor: '0.2500', vigenciaDesde: '2026-11-19', vigenciaHasta: null }
    expect(tarifaHistorica.parse(tarifa)).toEqual(tarifa)
    expect(tarifaHistorica.safeParse({ ...tarifa, valor: 0.25 }).success).toBe(false)
  })

  it('envía únicamente metadatos modificados y conserva la desvinculación de cuenta', () => {
    const actual = { descripcion: 'Retiro', estado: 'A' as const, idCuentaContableIngreso: 42 }
    expect(cambiosMetadatos(actual, { ...actual, idCuentaContableIngreso: null })).toEqual({ idCuentaContableIngreso: null })
    expect(cambiosMetadatos(actual, actual)).toEqual({})
  })
})
