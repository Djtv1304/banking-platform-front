import { describe, expect, it } from 'vitest'

import { payloadTasa, tasaFormSchema } from '@/features/catalogos/lib/tasa-form'

const base = {
  tipoTasa: 'CREDITO' as const,
  idTipoCredito: '1',
  tasa: '16.5',
  recargoMora: '',
  plazoMaximoMeses: '48',
  montoMinimo: '500',
  montoMaximo: '',
  vigenciaDesde: '2026-12-01',
  vigenciaHasta: '',
}

describe('formulario de tasa de interés', () => {
  it('pasa el porcentaje a fracción y omite lo vacío', () => {
    expect(payloadTasa(tasaFormSchema.parse(base))).toEqual({
      tipoTasa: 'CREDITO',
      idTipoCredito: 1,
      tasaNominalAnual: 0.165,
      recargoMoraSobreTasa: 0,
      plazoMaximoMeses: 48,
      montoMinimo: 500,
      vigenciaDesde: '2026-12-01',
    })
  })

  it('rechaza tasas, montos, plazos y fechas fuera de rango', () => {
    for (const cambio of [
      { tasa: '0' },
      { tasa: '101' },
      { tasa: '16,5' },
      { plazoMaximoMeses: '' },
      { montoMaximo: '100' },
      { vigenciaHasta: '2026-11-30' },
      { idTipoCredito: '' },
    ]) {
      expect(tasaFormSchema.safeParse({ ...base, ...cambio }).success, JSON.stringify(cambio)).toBe(false)
    }
  })
})

describe('tasas de ahorro y de tarjeta', () => {
  it('no llevan tipo de crédito y el plazo es opcional', () => {
    const ahorro = tasaFormSchema.parse({ ...base, tipoTasa: 'AHORRO', idTipoCredito: '', plazoMaximoMeses: '' })
    expect(payloadTasa(ahorro)).not.toHaveProperty('idTipoCredito')
    expect(payloadTasa(ahorro)).not.toHaveProperty('plazoMaximoMeses')
    expect(payloadTasa(ahorro).tipoTasa).toBe('AHORRO')
  })

  it('crédito exige tipo de crédito y plazo', () => {
    expect(tasaFormSchema.safeParse({ ...base, idTipoCredito: '' }).success).toBe(false)
    expect(tasaFormSchema.safeParse({ ...base, plazoMaximoMeses: '' }).success).toBe(false)
  })
})
