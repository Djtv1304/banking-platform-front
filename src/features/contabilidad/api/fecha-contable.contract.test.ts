import { describe, expect, it } from 'vitest'

import { FECHA_CONTABLE_ENDPOINTS, fechaContableSchema } from '@/features/contabilidad/api/fecha-contable.contract'

/* Forma de FechaContable en Backend/app/modules/contabilidad/schemas.py */
const FECHA = {
  idFechaContable: 321,
  fecha: '2026-11-17',
  esDiaContable: true,
  esFeriado: false,
  esFinDeSemana: false,
  horaCorte: '19:00:00',
}

describe('fechaContableSchema', () => {
  it('acepta la fecha vigente de CON-01', () => {
    expect(fechaContableSchema.parse(FECHA)).toEqual(FECHA)
  })

  it('acepta un feriado que no es día contable', () => {
    const feriado = fechaContableSchema.parse({ ...FECHA, fecha: '2026-11-20', esDiaContable: false, esFeriado: true })
    expect(feriado.esDiaContable).toBe(false)
    expect(feriado.esFeriado).toBe(true)
  })

  it('rechaza una fecha que no es YYYY-MM-DD o no existe', () => {
    expect(fechaContableSchema.safeParse({ ...FECHA, fecha: '17/11/2026' }).success).toBe(false)
    expect(fechaContableSchema.safeParse({ ...FECHA, fecha: '2026-02-30' }).success).toBe(false)
  })

  it('rechaza banderas como texto y la hora de corte ausente', () => {
    expect(fechaContableSchema.safeParse({ ...FECHA, esFeriado: 'false' }).success).toBe(false)
    expect(fechaContableSchema.safeParse({ ...FECHA, horaCorte: undefined }).success).toBe(false)
  })
})

describe('FECHA_CONTABLE_ENDPOINTS', () => {
  it('arma las rutas relativas /api/v1', () => {
    expect(FECHA_CONTABLE_ENDPOINTS.actual).toBe('/api/v1/contabilidad/fechas-contables/actual')
    expect(FECHA_CONTABLE_ENDPOINTS.fecha('2026-11-20')).toBe('/api/v1/contabilidad/fechas-contables/2026-11-20')
  })
})
