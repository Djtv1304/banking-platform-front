import { describe, expect, it } from 'vitest'

import { ApiError } from '@/shared/api'
import type { Movimiento } from '@/features/cuenta/api/movimientos.contract'
import {
  armarParametrosMovimientos,
  esCuentaInexistente,
  fechaLocal,
  filaMovimiento,
  filtrosMovimientosIniciales,
  filtrosMovimientosSchema,
  mensajeErrorMovimientos,
  rangoInicial,
  textoFechaContable,
  textoNaturaleza,
} from '@/features/cuenta/lib/movimientos'

const movimiento = (cambios: Partial<Movimiento> = {}): Movimiento => ({
  idMovimiento: 1,
  idTransaccion: 10,
  numeroComprobante: 'CMP-0001',
  tipoTransaccion: 'DEPOSITO',
  tipoMovimiento: 'C',
  rolCuenta: 'Destino',
  monto: 25.5,
  saldoAnterior: 100,
  saldoPosterior: 125.5,
  fechaContable: '2026-11-09',
  fechaHoraSistema: '2026-11-09T14:30:00-05:00',
  idCanal: 1,
  ...cambios,
})

describe('fechaLocal', () => {
  it('usa el día local aunque en UTC ya sea el siguiente', () => {
    // 23:30 locales: en Ecuador (UTC-5) ya serían las 04:30 UTC del día siguiente
    expect(fechaLocal(new Date(2026, 10, 9, 23, 30))).toBe('2026-11-09')
  })

  it('rellena mes y día con ceros', () => {
    expect(fechaLocal(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('rangoInicial', () => {
  it('abarca los últimos 30 días contando hoy', () => {
    expect(rangoInicial(new Date(2026, 10, 9))).toEqual({ desde: '2026-10-11', hasta: '2026-11-09' })
  })

  it('cruza el cambio de mes y de año', () => {
    expect(rangoInicial(new Date(2026, 0, 15))).toEqual({ desde: '2025-12-17', hasta: '2026-01-15' })
  })

  it('respeta los años bisiestos', () => {
    expect(rangoInicial(new Date(2028, 2, 10))).toEqual({ desde: '2028-02-10', hasta: '2028-03-10' })
  })

  it('no depende de la hora del día', () => {
    expect(rangoInicial(new Date(2026, 10, 9, 23, 59))).toEqual(rangoInicial(new Date(2026, 10, 9, 0, 1)))
  })

  it('los filtros iniciales traen el tipo vacío y pasan la validación', () => {
    const iniciales = filtrosMovimientosIniciales(new Date(2026, 10, 9))
    expect(iniciales).toEqual({ desde: '2026-10-11', hasta: '2026-11-09', tipoTransaccion: '' })
    expect(filtrosMovimientosSchema.safeParse(iniciales).success).toBe(true)
  })
})

describe('filtrosMovimientosSchema', () => {
  const base = { desde: '2026-11-01', hasta: '2026-11-09', tipoTransaccion: '' }

  it('acepta desde igual a hasta (un solo día)', () => {
    expect(filtrosMovimientosSchema.safeParse({ ...base, desde: '2026-11-09' }).success).toBe(true)
  })

  it('rechaza desde posterior a hasta, con el error en «hasta»', () => {
    const resultado = filtrosMovimientosSchema.safeParse({ ...base, desde: '2026-11-10' })
    expect(resultado.success).toBe(false)
    expect(resultado.error?.issues[0].path).toEqual(['hasta'])
  })

  it('exige las dos fechas', () => {
    const resultado = filtrosMovimientosSchema.safeParse({ ...base, desde: '', hasta: '' })
    expect(resultado.error?.issues.map((issue) => issue.path[0])).toEqual(['desde', 'hasta'])
  })

  it('rechaza un día que no existe', () => {
    expect(filtrosMovimientosSchema.safeParse({ ...base, hasta: '2026-02-30' }).success).toBe(false)
  })

  it('recorta el tipo y limita su largo a 30', () => {
    expect(filtrosMovimientosSchema.parse({ ...base, tipoTransaccion: '  DEPOSITO  ' }).tipoTransaccion).toBe('DEPOSITO')
    expect(filtrosMovimientosSchema.safeParse({ ...base, tipoTransaccion: 'X'.repeat(31) }).success).toBe(false)
  })
})

describe('armarParametrosMovimientos', () => {
  const filtros = { desde: '2026-11-01', hasta: '2026-11-09', tipoTransaccion: '' }

  it('envía solo fechas y paginación cuando no hay tipo', () => {
    expect(armarParametrosMovimientos(filtros, 1)).toEqual({
      desde: '2026-11-01',
      hasta: '2026-11-09',
      page: '1',
      pageSize: '20',
    })
  })

  it('un tipo en blanco no se envía', () => {
    expect(armarParametrosMovimientos({ ...filtros, tipoTransaccion: '   ' }, 1)).not.toHaveProperty('tipoTransaccion')
  })

  it('combina el tipo con las fechas y la página', () => {
    expect(armarParametrosMovimientos({ ...filtros, tipoTransaccion: ' RETIRO ' }, 3)).toEqual({
      desde: '2026-11-01',
      hasta: '2026-11-09',
      tipoTransaccion: 'RETIRO',
      page: '3',
      pageSize: '20',
    })
  })
})

describe('textos de un movimiento', () => {
  it('D es débito y C es crédito', () => {
    expect(textoNaturaleza('D')).toBe('Débito')
    expect(textoNaturaleza('C')).toBe('Crédito')
  })

  it('el día contable no se corre por la zona horaria', () => {
    expect(textoFechaContable('2026-11-09')).toMatch(/^9 nov\.? 2026$/)
    expect(textoFechaContable('2026-01-01')).toMatch(/^1 ene\.? 2026$/)
  })

  it('una fecha ilegible se muestra tal cual', () => {
    expect(textoFechaContable('no-es-fecha')).toBe('no-es-fecha')
  })
})

describe('filaMovimiento', () => {
  it('da formato a cada dato de un crédito', () => {
    const fila = filaMovimiento(movimiento())
    expect(fila).toMatchObject({ naturaleza: 'Crédito', esDebito: false, tipo: 'DEPOSITO', comprobante: 'CMP-0001' })
    expect(fila.monto).toContain('25,50')
    expect(fila.saldoPosterior).toContain('125,50')
  })

  it('muestra un guion cuando no hay comprobante', () => {
    expect(filaMovimiento(movimiento({ numeroComprobante: null })).comprobante).toBe('—')
  })

  it('una cuenta con reverso lista ambos movimientos, el original no se oculta', () => {
    const original = movimiento({ idMovimiento: 7, tipoTransaccion: 'RETIRO', tipoMovimiento: 'D', monto: 40 })
    const reverso = movimiento({ idMovimiento: 8, tipoTransaccion: 'REVERSO', tipoMovimiento: 'C', monto: 40 })
    const filas = [original, reverso].map(filaMovimiento)
    expect(filas.map((fila) => [fila.id, fila.naturaleza])).toEqual([
      [7, 'Débito'],
      [8, 'Crédito'],
    ])
  })

  it('sin movimientos no hay filas', () => {
    expect([].map(filaMovimiento)).toEqual([])
  })
})

describe('errores de CTA-06', () => {
  it('RANGO_FECHAS_INVALIDO muestra el mensaje propio', () => {
    expect(mensajeErrorMovimientos(new ApiError('desde debe ser anterior o igual a hasta.', 400, 'RANGO_FECHAS_INVALIDO'))).toBe(
      'La fecha «Desde» debe ser anterior o igual a «Hasta».',
    )
  })

  it('403 explica que falta el permiso', () => {
    expect(mensajeErrorMovimientos(new ApiError('Forbidden', 403, 'FORBIDDEN'))).toBe(
      'No tienes permiso para ver los movimientos de esta cuenta.',
    )
  })

  it('un código desconocido muestra el mensaje del backend', () => {
    expect(mensajeErrorMovimientos(new ApiError('Algo falló.', 500, 'ERROR_INTERNO'))).toBe('Algo falló.')
  })

  it('solo CUENTA_NO_ENCONTRADA es cuenta inexistente: otro 404 no se disfraza', () => {
    expect(esCuentaInexistente(new ApiError('No existe', 404, 'CUENTA_NO_ENCONTRADA'))).toBe(true)
    expect(esCuentaInexistente(new ApiError('Not Found', 404, 'http_404'))).toBe(false)
  })
})
