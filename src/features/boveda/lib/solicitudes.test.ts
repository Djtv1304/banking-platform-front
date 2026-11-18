import { describe, expect, it } from 'vitest'

import {
  etiquetaEstadoSolicitud,
  nombreBoveda,
  solicitudPendiente,
  subtotalPieza,
  textoResolucion,
  tonoEstadoSolicitud,
  valoresDeSolicitud,
} from '@/features/boveda/lib/solicitudes'

describe('solicitudes de movimiento', () => {
  it('etiqueta y colorea cada estado; uno desconocido se muestra tal cual', () => {
    expect(etiquetaEstadoSolicitud(' pendiente ')).toBe('Pendiente')
    expect(etiquetaEstadoSolicitud('EN_REVISION')).toBe('EN_REVISION')
    expect(tonoEstadoSolicitud('EJECUTADA')).toBe('exito')
    expect(tonoEstadoSolicitud('RECHAZADA')).toBe('rechazo')
    expect(tonoEstadoSolicitud('CANCELADA')).toBe('neutro')
    expect(textoResolucion('EJECUTADA')).toBe('Aprobada por')
  })

  it('solo una pendiente admite acciones', () => {
    expect(solicitudPendiente({ estado: 'PENDIENTE' })).toBe(true)
    expect(solicitudPendiente({ estado: 'EJECUTADA' })).toBe(false)
  })

  it('el valor unitario de la solicitud manda sobre el catálogo', () => {
    const valores = valoresDeSolicitud(
      { desglose: [{ idDenominacion: 4, cantidad: 2, valorUnitario: 20 }, { idDenominacion: 5, cantidad: 1, valorUnitario: null }] },
      [
        { idDenominacion: 4, valor: 999 },
        { idDenominacion: 5, valor: 10 },
      ],
    )
    expect(valores.get(4)).toBe(20)
    expect(valores.get(5)).toBe(10)
    expect(subtotalPieza(3, 0.1)).toBe(0.3)
    expect(subtotalPieza(3, undefined)).toBeNull()
  })

  it('nombra la bóveda por su código o por su ID', () => {
    const bovedas = [{ idBoveda: 1, codigoBoveda: 'BOV-GEN-01' }]
    expect(nombreBoveda(1, bovedas)).toBe('BOV-GEN-01')
    expect(nombreBoveda(7, bovedas)).toBe('Bóveda 7')
    expect(nombreBoveda(null, bovedas)).toBeNull()
  })
})
