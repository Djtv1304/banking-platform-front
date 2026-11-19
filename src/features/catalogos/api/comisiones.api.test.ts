import { describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import { cambiarComision, cambiosMetadatos, CLAVE_GESTION_COMISIONES, invalidarComisiones, resultadoComision, tarifaHistorica } from '@/features/catalogos/api/comisiones.api'

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

  it('solicita la tarifa por E1-12 sin modificar la tarifa en caché', async () => {
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({
      status: 202, data: { idSolicitud: 345, estado: 'Pendiente', requiereAprobacion: true },
    })
    try {
      const entrada = { valor: '0.3750', vigenciaDesde: '2026-12-01' }
      await expect(cambiarComision(42, entrada)).resolves.toMatchObject({ tipo: 'solicitud', idSolicitud: 345 })
      expect(patch).toHaveBeenCalledExactlyOnceWith('/api/v1/parametros/comisiones/42', entrada)
    } finally {
      patch.mockRestore()
    }
  })

  it('invalida la tabla, el catálogo para productos y las consultas de tarifa', async () => {
    const cliente = new QueryClient()
    const claves = [
      ['catalogos', 'administracion', 'comisiones'],
      ['catalogos', 'comisiones'],
      [...CLAVE_GESTION_COMISIONES, 42, 'tarifa', '2026-12-01'],
    ]
    claves.forEach(clave => cliente.setQueryData(clave, []))
    await invalidarComisiones(cliente)
    expect(claves.every(clave => cliente.getQueryState(clave)?.isInvalidated)).toBe(true)
  })
})
