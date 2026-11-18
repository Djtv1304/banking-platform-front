import { describe, expect, it } from 'vitest'

import { bovedaSchema, paginaMovimientosBovedaSchema } from '@/features/boveda/api/bovedas.contract'
import { accesoBoveda } from '@/features/boveda/lib/acceso'
import {
  armarParametrosBovedas,
  armarParametrosMovimientos,
  FILTROS_MOVIMIENTOS_VACIOS,
  filtrosMovimientosSchema,
  leerIdBoveda,
  resumenPaginacion,
} from '@/features/boveda/lib/filtros'
import {
  agruparDenominaciones,
  cupoDisponible,
  descuadre,
  etiquetaMovimiento,
  etiquetaValor,
  formatearFechaHora,
  montoConSigno,
  nivelSaldo,
  piezasDelMovimiento,
  posicionesBarra,
  textoNivel,
  valoresPorDenominacion,
} from '@/features/boveda/lib/formato'

const BOVEDA = {
  idBoveda: 2,
  codigoBoveda: 'BOV002',
  tipoBoveda: 'Mayor',
  idAgencia: '002',
  idBovedaSuperior: 1,
  limiteMaximo: 60000,
  limiteMinimo: 5000,
  saldoActual: 38737.15,
  estado: 'A',
  denominaciones: [
    { idDenominacion: 1, cantidadActual: 6, valor: 1, subtotal: 6 },
    { idDenominacion: 4, cantidadActual: 1836, valor: 20, subtotal: 36720 },
    { idDenominacion: 6, cantidadActual: 10, valor: 100, subtotal: 1000 },
    { idDenominacion: 10, cantidadActual: 4, valor: 0.25, subtotal: 1 },
    { idDenominacion: 7, cantidadActual: 5, valor: 0.01, subtotal: 0.05 },
  ],
  totalDesglose: 38737.15,
}

const sinEspacios = (texto: string) => texto.replace(/\s/g, ' ')

describe('contrato', () => {
  it('acepta la bóveda del backend, también la General sin bóveda superior', () => {
    expect(bovedaSchema.safeParse(BOVEDA).success).toBe(true)
    expect(bovedaSchema.safeParse({ ...BOVEDA, idBovedaSuperior: null }).success).toBe(true)
    expect(bovedaSchema.safeParse('<!doctype html>').success).toBe(false)
  })

  it('lee un movimiento con sus campos opcionales en null y sin desglose', () => {
    const pagina = paginaMovimientosBovedaSchema.parse({
      items: [
        {
          idMovimiento: 413,
          idBoveda: 1,
          idBovedaContraparte: null,
          tipoMovimiento: 'DevolucionCaja',
          naturaleza: 'I',
          monto: 2200,
          saldoAnterior: 222018.48,
          saldoPosterior: 224218.48,
          autorizadoPor: 2,
          idUsuarioMovimiento: 1,
          idMovimientoRelacionado: null,
          fechaMovimiento: '2026-10-14T17:15:00-05:00',
          observaciones: null,
          idAsientoContable: null,
          desglose: null,
        },
      ],
      page: 1,
      pageSize: 5,
      total: 212,
    })
    expect(pagina.items[0].desglose).toEqual([])
  })
})

describe('accesoBoveda', () => {
  it('el AUDITOR consulta movimientos y registra arqueos, pero no lista ni ve saldos', () => {
    expect(accesoBoveda(['AUDITOR'])).toEqual({
      listar: false,
      consultar: false,
      movimientos: true,
      registrarMovimiento: false,
      registrarArqueo: true,
      aprobarArqueo: false,
    })
  })

  it('el CONTADOR solo consulta; ADMIN y SUPERVISOR entran a todo', () => {
    expect(accesoBoveda(['contador'])).toMatchObject({ listar: true, movimientos: true, registrarMovimiento: false })
    for (const rol of ['ADMIN', 'SUPERVISOR']) {
      expect(Object.values(accesoBoveda([rol])).every(Boolean)).toBe(true)
    }
    expect(Object.values(accesoBoveda(['CAJERO'])).some(Boolean)).toBe(false)
  })
})

describe('saldo y límites', () => {
  it('clasifica el saldo; los extremos cuentan como dentro', () => {
    expect(nivelSaldo(BOVEDA)).toBe('normal')
    expect(nivelSaldo({ ...BOVEDA, saldoActual: 5000 })).toBe('normal')
    expect(nivelSaldo({ ...BOVEDA, saldoActual: 60000 })).toBe('normal')
    expect(nivelSaldo({ ...BOVEDA, saldoActual: 4999.99 })).toBe('bajo')
    expect(nivelSaldo({ ...BOVEDA, saldoActual: 60000.01 })).toBe('sobre')
  })

  it('dice cuánto falta o sobra sin errores de coma flotante', () => {
    expect(sinEspacios(textoNivel({ ...BOVEDA, saldoActual: 4999.9 }))).toBe('Faltan $0,10 para el mínimo')
    expect(sinEspacios(textoNivel({ ...BOVEDA, saldoActual: 61250.5 }))).toBe('Excede el máximo por $1.250,50')
    expect(cupoDisponible(BOVEDA)).toBe(21262.85)
    expect(cupoDisponible({ ...BOVEDA, saldoActual: 70000 })).toBe(0)
  })

  it('ubica saldo y límites en la barra sin salirse de 0–100', () => {
    const { saldo, minimo, maximo } = posicionesBarra(BOVEDA)
    expect(minimo).toBeLessThan(saldo)
    expect(saldo).toBeLessThan(maximo)
    expect(maximo).toBeLessThan(100)
    expect(posicionesBarra({ ...BOVEDA, saldoActual: 90000 }).saldo).toBeLessThan(100)
    expect(posicionesBarra({ saldoActual: 0, limiteMinimo: 0, limiteMaximo: 0 })).toEqual({ saldo: 0, minimo: 0, maximo: 0 })
  })

  it('detecta cuando el desglose no cuadra con el saldo', () => {
    expect(descuadre(BOVEDA)).toBe(0)
    expect(descuadre({ saldoActual: 224218.48, totalDesglose: 224218.45 })).toBe(-0.03)
  })
})

describe('denominaciones', () => {
  it('separa billetes y monedas con el catálogo y ordena de mayor a menor valor', () => {
    const catalogo = [
      { idDenominacion: 1, tipoPieza: 'Billete' as const },
      { idDenominacion: 4, tipoPieza: 'Billete' as const },
      { idDenominacion: 6, tipoPieza: 'Billete' as const },
      { idDenominacion: 7, tipoPieza: 'Moneda' as const },
      { idDenominacion: 10, tipoPieza: 'Moneda' as const },
    ]
    const [billetes, monedas] = agruparDenominaciones(BOVEDA.denominaciones, catalogo)
    expect(billetes.piezas.map((pieza) => pieza.valor)).toEqual([100, 20, 1])
    expect(billetes).toMatchObject({ tipo: 'Billete', cantidad: 1852, subtotal: 37726 })
    expect(monedas.piezas.map((pieza) => pieza.valor)).toEqual([0.25, 0.01])
    expect(monedas.subtotal).toBe(1.05)
    expect(billetes.piezas[1].porcentaje).toBeCloseTo(97.33, 1)
  })

  it('sin catálogo asume moneda bajo un dólar y omite los grupos vacíos', () => {
    const grupos = agruparDenominaciones([{ idDenominacion: 4, cantidadActual: 2, valor: 20, subtotal: 40 }], [])
    expect(grupos.map((grupo) => grupo.tipo)).toEqual(['Billete'])
    expect(agruparDenominaciones([], [])).toEqual([])
  })

  it('escribe los valores en dólares o en centavos', () => {
    expect(etiquetaValor(100)).toBe('$100')
    expect(etiquetaValor(0.25)).toBe('25¢')
    expect(etiquetaValor(0.01)).toBe('1¢')
  })
})

describe('movimientos', () => {
  it('nombra los tipos, también uno que la SPA no conoce', () => {
    expect(etiquetaMovimiento('AbastecimientoATM')).toBe('Abastecimiento de ATM')
    expect(etiquetaMovimiento('CanjeDeMonedas')).toBe('Canje de monedas')
  })

  it('pone el signo según la naturaleza y la hora de Ecuador', () => {
    expect(sinEspacios(montoConSigno({ naturaleza: 'I', monto: 2200 }))).toBe('+$2.200,00')
    expect(sinEspacios(montoConSigno({ naturaleza: 'E', monto: 1000 }))).toBe('−$1.000,00')
    expect(formatearFechaHora('2026-10-14T17:15:00-05:00')).toContain('17:15')
    expect(formatearFechaHora('2026-10-14T22:15:00Z')).toContain('17:15')
    expect(formatearFechaHora('no es fecha')).toBe('no es fecha')
  })

  it('lee el desglose con el valor de cada denominación', () => {
    const valores = valoresPorDenominacion([{ idDenominacion: 4, valor: 20 }], [{ idDenominacion: 6, valor: 100 }])
    const piezas = piezasDelMovimiento(
      [
        { idDenominacion: 4, cantidad: 60 },
        { idDenominacion: 6, cantidad: 10 },
        { idDenominacion: 99, cantidad: 3 },
      ],
      valores,
    )
    expect(piezas.map((pieza) => pieza.texto)).toEqual(['10 × $100', '60 × $20', '3 piezas (den. 99)'])
  })
})

describe('filtros', () => {
  it('BOV-01 envía solo los filtros con valor', () => {
    expect(armarParametrosBovedas({ idAgencia: '', tipo: '' })).toEqual({})
    expect(armarParametrosBovedas({ idAgencia: '001', tipo: 'Mayor' })).toEqual({ idAgencia: '001', tipo: 'Mayor' })
  })

  it('BOV-03 no envía filtros vacíos ni el orden por defecto', () => {
    expect(armarParametrosMovimientos(FILTROS_MOVIMIENTOS_VACIOS, 'desc', 1)).toEqual({ page: '1', pageSize: '20' })
    expect(
      armarParametrosMovimientos({ tipoMovimiento: 'DotacionCaja', desde: '2026-10-01', hasta: '2026-10-14' }, 'asc', 3),
    ).toEqual({
      page: '3',
      pageSize: '20',
      tipoMovimiento: 'DotacionCaja',
      desde: '2026-10-01',
      hasta: '2026-10-14',
      sort: 'fechaMovimiento,asc',
    })
  })

  it('las fechas son opcionales, pero deben ser reales y estar en orden', () => {
    const validar = (desde: string, hasta: string) =>
      filtrosMovimientosSchema.safeParse({ tipoMovimiento: '', desde, hasta }).success
    expect(validar('', '')).toBe(true)
    expect(validar('2026-10-01', '')).toBe(true)
    expect(validar('2026-10-14', '2026-10-14')).toBe(true)
    expect(validar('2026-10-15', '2026-10-14')).toBe(false)
    expect(validar('2026-02-30', '')).toBe(false)
  })

  it('lee el id de la bóveda y resume la paginación', () => {
    expect(leerIdBoveda(' 12 ')).toBe(12)
    expect(leerIdBoveda('0')).toBeNull()
    expect(leerIdBoveda('1.5')).toBeNull()
    expect(leerIdBoveda('99999999999')).toBeNull()
    expect(leerIdBoveda(undefined)).toBeNull()
    expect(resumenPaginacion(2, 212)).toBe('Página 2 de 11 · 212 movimientos')
    expect(resumenPaginacion(1, 1)).toBe('Página 1 de 1 · 1 movimiento')
  })
})
