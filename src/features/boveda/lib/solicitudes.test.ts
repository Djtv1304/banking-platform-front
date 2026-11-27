import { describe, expect, it } from 'vitest'

import { solicitudMovimientoSchema } from '@/features/boveda/api/bovedas.contract'
import {
  accionesConfirmacion,
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

  it('distingue las solicitudes que esperan aprobación', () => {
    expect(solicitudPendiente({ estado: 'PENDIENTE' })).toBe(true)
    expect(solicitudPendiente({ estado: 'EJECUTADA' })).toBe(false)
  })

  it('muestra cada confirmación del traslado en su agencia operativa', () => {
    const base = solicitudMovimientoSchema.parse({
      idSolicitudMovimiento: 1, idBoveda: 2, idBovedaContraparte: 3, idAgencia: '001', idAgenciaDestino: '002',
      tipoMovimiento: 'Traslado', estado: 'PENDIENTE', monto: 100, fechaSolicitud: '2026-11-27T14:30:00-05:00',
    })
    expect(accionesConfirmacion(base, '001')).toEqual(['aprobacion'])
    expect(accionesConfirmacion({ ...base, estado: 'APROBADO' }, '001')).toEqual(['despacho'])
    const enTransito = { ...base, estado: 'DESPACHADO' }
    expect(accionesConfirmacion(enTransito, '002')).toEqual(['recepcion'])
    expect(accionesConfirmacion(enTransito, '001')).toEqual(['devolucion'])
    expect(accionesConfirmacion(enTransito, '003')).toEqual([])
    expect(accionesConfirmacion(enTransito, null)).toEqual([])
    expect(accionesConfirmacion({ ...base, estado: 'ANULADA' }, '001')).toEqual([])
  })

  it('conserva los asientos del despacho, confirmación y diferencia', () => {
    const recibida = solicitudMovimientoSchema.parse({
      idSolicitudMovimiento: 1, idBoveda: 2, tipoMovimiento: 'Traslado', estado: 'RECIBIDO',
      monto: 100, montoConfirmado: 95, fechaSolicitud: '2026-11-27T14:30:00-05:00',
      diferencia: -5, actaNovedad: 'ACTA-5', idAsientoDespacho: 1, idAsientoConfirmacion: 2, idAsientoNovedad: 3,
      conteoConfirmado: [{ idDenominacion: 1, cantidad: 19, valorUnitario: 5 }],
    })
    expect(recibida).toMatchObject({ diferencia: -5, idAsientoDespacho: 1, idAsientoConfirmacion: 2, idAsientoNovedad: 3 })
    expect(recibida.conteoConfirmado).toHaveLength(1)
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
