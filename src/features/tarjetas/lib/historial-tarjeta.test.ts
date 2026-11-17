import { describe, expect, it } from 'vitest'

import {
  etiquetaEvento,
  etiquetaOrigenPin,
  etiquetaResultado,
  filtroHistorialSchema,
  parametrosHistorial,
} from '@/features/tarjetas/lib/historial-tarjeta'

describe('textos del historial', () => {
  it('traduce los eventos conocidos y deja los demás', () => {
    expect(etiquetaEvento('CambioPin')).toBe('Cambio de PIN')
    expect(etiquetaEvento('Activacion')).toBe('Activación')
    expect(etiquetaEvento('Emision')).toBe('Emision')
  })

  it('el origen del PIN solo se muestra en CambioPin', () => {
    expect(etiquetaOrigenPin('CambioPin', 'Regeneracion')).toBe('Regeneración')
    expect(etiquetaOrigenPin('CambioPin', undefined)).toBe('—')
    expect(etiquetaOrigenPin('Bloqueo', 'Cliente')).toBe('—')
  })

  it('el resultado se muestra en minúsculas con mayúscula inicial', () => {
    expect(etiquetaResultado('COMPLETADO')).toBe('Completado')
    expect(etiquetaResultado(undefined)).toBe('—')
  })
})

describe('filtro del historial', () => {
  it('las fechas son opcionales', () => {
    expect(filtroHistorialSchema.safeParse({ fechaDesde: '', fechaHasta: '' }).success).toBe(true)
  })

  it('rechaza un borrador incompleto y un rango invertido', () => {
    expect(filtroHistorialSchema.safeParse({ fechaDesde: '17/11/', fechaHasta: '' }).success).toBe(false)
    const invertido = filtroHistorialSchema.safeParse({ fechaDesde: '2026-11-17', fechaHasta: '2026-11-01' })
    expect(invertido.error?.issues[0].path).toEqual(['fechaHasta'])
  })

  it('no envía fechas vacías', () => {
    expect(parametrosHistorial({ fechaDesde: '2026-11-01', fechaHasta: '' }, 2)).toEqual({
      page: '2',
      pageSize: '20',
      fechaDesde: '2026-11-01',
    })
  })
})
