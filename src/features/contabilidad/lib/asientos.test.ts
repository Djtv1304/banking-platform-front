import { describe, expect, it } from 'vitest'

import { ApiError } from '@/shared/api'
import {
  FILTROS_ASIENTOS_VACIOS,
  MENSAJE_ASIENTOS_NO_DISPONIBLE,
  ORDEN_ASIENTOS_INICIAL,
  alternarOrden,
  armarParametrosAsientos,
  cuadreAsiento,
  esFechaIsoValida,
  esAsientoAnulado,
  esAsientoReversado,
  esReverso,
  etiquetaCuenta,
  etiquetaEstadoAsiento,
  etiquetaOrigenAsiento,
  etiquetaTexto,
  formatearFechaAsiento,
  mensajeErrorAsientos,
  motivoDescuadre,
  resumenPaginacionAsientos,
  tonoEstadoAsiento,
  totalesDeLineas,
  totalPaginasAsientos,
} from '@/features/contabilidad/lib/asientos'

describe('armarParametrosAsientos', () => {
  it('sin filtros ni orden propio solo manda la paginación', () => {
    expect(armarParametrosAsientos(FILTROS_ASIENTOS_VACIOS, 1, ORDEN_ASIENTOS_INICIAL)).toEqual({ page: '1', pageSize: '20' })
  })

  it('manda solo los filtros con valor, la página y el orden elegido', () => {
    const params = armarParametrosAsientos(
      { fecha: '2026-11-16', origen: 'CAJA', idAgencia: '', estado: 'CONTABILIZADO' },
      3,
      { campo: 'totalDebito', direccion: 'asc' },
    )
    expect(params).toEqual({
      page: '3',
      pageSize: '20',
      fecha: '2026-11-16',
      origen: 'CAJA',
      estado: 'CONTABILIZADO',
      sort: 'totalDebito,asc',
    })
  })

  it('la fecha ascendente sí se manda: ya no es el orden de partida', () => {
    expect(armarParametrosAsientos(FILTROS_ASIENTOS_VACIOS, 1, { campo: 'fechaAsiento', direccion: 'asc' }).sort).toBe('fechaAsiento,asc')
  })
})

describe('alternarOrden', () => {
  it('una columna nueva empieza ascendente, salvo fecha y total que van de mayor a menor', () => {
    expect(alternarOrden(ORDEN_ASIENTOS_INICIAL, 'numeroAsiento')).toEqual({ campo: 'numeroAsiento', direccion: 'asc' })
    expect(alternarOrden({ campo: 'estado', direccion: 'asc' }, 'totalDebito')).toEqual({ campo: 'totalDebito', direccion: 'desc' })
  })

  it('la misma columna invierte la dirección', () => {
    expect(alternarOrden(ORDEN_ASIENTOS_INICIAL, 'fechaAsiento').direccion).toBe('asc')
    expect(alternarOrden({ campo: 'origen', direccion: 'asc' }, 'origen').direccion).toBe('desc')
  })
})

describe('esFechaIsoValida', () => {
  it('solo acepta días reales', () => {
    expect(esFechaIsoValida('2026-11-16')).toBe(true)
    expect(esFechaIsoValida('2026-02-30')).toBe(false)
    expect(esFechaIsoValida('16/11/2026')).toBe(false)
    expect(esFechaIsoValida('')).toBe(false)
  })
})

describe('paginación', () => {
  it('calcula las páginas y el resumen', () => {
    expect(totalPaginasAsientos(0)).toBe(1)
    expect(totalPaginasAsientos(45)).toBe(3)
    expect(resumenPaginacionAsientos(2, 45)).toBe('Página 2 de 3 · 45 asientos')
    expect(resumenPaginacionAsientos(1, 1)).toBe('Página 1 de 1 · 1 asiento')
  })
})

describe('totales y cuadre', () => {
  const debito = (monto: number) => ({ tipoMovimiento: 'DEBITO', monto })
  const credito = (monto: number) => ({ tipoMovimiento: 'CREDITO', monto })

  it('suma por tipo sin error de coma flotante', () => {
    const totales = totalesDeLineas([debito(0.1), debito(0.2), credito(0.3)])
    expect(totales).toEqual({ debitos: 0.3, creditos: 0.3, cuadra: true })
  })

  it('detecta un descuadre', () => {
    expect(totalesDeLineas([debito(100), credito(99.99)]).cuadra).toBe(false)
  })

  it('un asiento cuadra solo si líneas y cabecera coinciden', () => {
    const lineas = [debito(50), credito(50)]
    expect(cuadreAsiento({ detalle: lineas, totalDebito: 50, totalCredito: 50 }).cuadra).toBe(true)
    expect(cuadreAsiento({ detalle: lineas, totalDebito: 60, totalCredito: 60 }).cuadra).toBe(false)
    expect(cuadreAsiento({ detalle: lineas, totalDebito: 50, totalCredito: 60 }).cuadra).toBe(false)
  })

  it('un asiento sin líneas con totales en cero cuadra', () => {
    expect(cuadreAsiento({ detalle: [], totalDebito: 0, totalCredito: 0 }).cuadra).toBe(true)
  })
})

describe('motivoDescuadre', () => {
  const lineas = [
    { tipoMovimiento: 'DEBITO', monto: 50 },
    { tipoMovimiento: 'CREDITO', monto: 50 },
  ]

  it('no hay motivo si cuadra', () => {
    expect(motivoDescuadre({ detalle: lineas, totalDebito: 50, totalCredito: 50 })).toBeNull()
  })

  it('explica si las líneas no cuadran entre sí', () => {
    const motivo = motivoDescuadre({ detalle: [lineas[0]], totalDebito: 50, totalCredito: 50 })
    expect(motivo).toMatch(/débitos .*50,00.* créditos .*0,00.* no son iguales/)
  })

  it('explica si la cabecera no cuadra o no coincide con las líneas', () => {
    expect(motivoDescuadre({ detalle: lineas, totalDebito: 50, totalCredito: 60 })).toMatch(/cabecera no son iguales/)
    expect(motivoDescuadre({ detalle: lineas, totalDebito: 60, totalCredito: 60 })).toMatch(/no suman lo mismo/)
  })
})

describe('presentación', () => {
  it('formatea la fecha sin pasar por zona horaria', () => {
    expect(formatearFechaAsiento('2026-01-05')).toBe('05/01/2026')
    expect(formatearFechaAsiento('texto')).toBe('texto')
  })

  it('muestra el nombre de la cuenta solo si el plan ya lo trae', () => {
    expect(etiquetaCuenta('110105', 'Caja general')).toBe('110105 · Caja general')
    expect(etiquetaCuenta('110105', undefined)).toBe('110105')
  })

  it('hace legibles los textos del backend', () => {
    expect(etiquetaEstadoAsiento('PENDIENTE_APROBACION')).toBe('Pendiente de aprobación')
    expect(etiquetaOrigenAsiento('NOMINA')).toBe('Nómina')
    expect(etiquetaOrigenAsiento('CAJA')).toBe('Caja')
    expect(etiquetaOrigenAsiento('ATM')).toBe('ATM')
    expect(etiquetaEstadoAsiento('EN_CURSO')).toBe('En curso')
    expect(etiquetaTexto(' ')).toBe('—')
  })

  it('elige un tono distinto por estado y deja neutro cualquier valor nuevo', () => {
    expect(tonoEstadoAsiento('CONTABILIZADO')).toBe('exito')
    expect(tonoEstadoAsiento(' contabilizado ')).toBe('exito')
    expect(tonoEstadoAsiento('REVERSADO')).toBe('advertencia')
    expect(tonoEstadoAsiento('ANULADO')).toBe('apagado')
    expect(tonoEstadoAsiento('PENDIENTE_APROBACION')).toBe('neutro')
    expect(tonoEstadoAsiento('OTRO')).toBe('neutro')
  })

  it('distingue anulado, reversado y asiento de reverso', () => {
    expect(esAsientoAnulado('anulado')).toBe(true)
    expect(esAsientoAnulado('REVERSADO')).toBe(false)
    expect(esAsientoReversado('REVERSADO')).toBe(true)
    expect(esAsientoReversado('CONTABILIZADO')).toBe(false)
    // El reverso trae el id del original y está CONTABILIZADO; el reversado trae null
    expect(esReverso({ idAsientoReversion: 301 })).toBe(true)
    expect(esReverso({ idAsientoReversion: null })).toBe(false)
  })
})

describe('mensajeErrorAsientos', () => {
  it('un endpoint sin desplegar se explica como no disponible', () => {
    for (const error of [new ApiError('x', 501, 'HTTP_501'), new ApiError('x', 404, 'HTTP_404'), new ApiError('x', 405, 'http_405')]) {
      expect(mensajeErrorAsientos(error)).toBe(MENSAJE_ASIENTOS_NO_DISPONIBLE)
    }
  })

  it('traduce los códigos del backend y el 403', () => {
    expect(mensajeErrorAsientos(new ApiError('x', 400, 'FECHA_INVALIDA'))).toMatch(/fecha/)
    expect(mensajeErrorAsientos(new ApiError('x', 404, 'ASIENTO_NO_ENCONTRADO'))).toMatch(/ya no existe/)
    expect(mensajeErrorAsientos(new ApiError('x', 403, 'PERMISO_DENEGADO'))).toMatch(/no tiene acceso/)
  })

  it('un error sin traducción conserva su mensaje', () => {
    expect(mensajeErrorAsientos(new ApiError('Se cayó', 500, 'ERROR'))).toBe('Se cayó')
  })
})
