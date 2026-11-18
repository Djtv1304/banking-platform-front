import { describe, expect, it } from 'vitest'

import { arqueoSchema, IDEMPOTENCY_KEY_REGEX, movimientosRegistradosSchema, registrarMovimientoSchema } from '@/features/boveda/api/bovedas.contract'
import {
  ARQUEO_VACIO,
  arqueoFormSchema,
  armarDesglose,
  claveParaEnvio,
  leerCantidad,
  MOVIMIENTO_VACIO,
  movimientoFormSchema,
  nuevaClaveIdempotencia,
  piezasInsuficientes,
  resultadoArqueo,
  saldoResultante,
  textoDiferencia,
  totalDesglose,
} from '@/features/boveda/lib/operaciones'

const sinEspacios = (texto: string) => texto.replace(/\s/g, ' ')

describe('cantidades', () => {
  it('lee enteros con o sin separador de miles y rechaza lo demás', () => {
    expect(leerCantidad('')).toBe(0)
    expect(leerCantidad(' 1.250 ')).toBe(1250)
    expect(leerCantidad('12,5')).toBeNull()
    expect(leerCantidad('-3')).toBeNull()
    expect(leerCantidad('9999999999')).toBeNull()
  })

  it('arma el desglose solo con las piezas que tienen cantidad, ordenado', () => {
    expect(armarDesglose({ d6: '10', d4: '60', d1: '', d7: '0' })).toEqual([
      { idDenominacion: 4, cantidad: 60 },
      { idDenominacion: 6, cantidad: 10 },
    ])
  })

  it('suma en centavos', () => {
    const valores = new Map([
      [4, 20],
      [7, 0.01],
      [8, 0.05],
    ])
    expect(
      totalDesglose(
        [
          { idDenominacion: 4, cantidad: 3 },
          { idDenominacion: 7, cantidad: 3 },
          { idDenominacion: 8, cantidad: 2 },
        ],
        valores,
      ),
    ).toBe(60.13)
  })

  it('marca lo que no alcanza y calcula el saldo resultante', () => {
    const enBoveda = [{ idDenominacion: 4, cantidadActual: 10, valor: 20, subtotal: 200 }]
    expect(piezasInsuficientes([{ idDenominacion: 4, cantidad: 11 }, { idDenominacion: 5, cantidad: 1 }], enBoveda)).toEqual([
      { idDenominacion: 4, pedida: 11, disponible: 10 },
      { idDenominacion: 5, pedida: 1, disponible: 0 },
    ])
    expect(saldoResultante(224218.48, 1000.1, 'E')).toBe(223218.38)
    expect(saldoResultante(0.1, 0.2, 'I')).toBe(0.3)
  })
})

describe('formulario de movimiento (BOV-04)', () => {
  const schema = movimientoFormSchema(1)

  it('arma el body sin contraparte ni observaciones vacías', () => {
    const body = schema.parse({ ...MOVIMIENTO_VACIO, tipoMovimiento: 'DotacionCaja', autorizadoPor: 2, observaciones: '  ', cantidades: { d4: '50' } })
    expect(body).toEqual({ desglose: [{ idDenominacion: 4, cantidad: 50 }], tipoMovimiento: 'DotacionCaja', autorizadoPor: 2 })
    expect(registrarMovimientoSchema.safeParse(body).success).toBe(true)
  })

  it('un traslado exige otra bóveda', () => {
    const base = { ...MOVIMIENTO_VACIO, tipoMovimiento: 'Traslado' as const, autorizadoPor: 2, cantidades: { d4: '1' } }
    expect(schema.safeParse(base).success).toBe(false)
    expect(schema.safeParse({ ...base, idBovedaContraparte: '1' }).success).toBe(false)
    expect(schema.parse({ ...base, idBovedaContraparte: '2' })).toMatchObject({ idBovedaContraparte: 2 })
  })

  it('pide tipo, autorizador y al menos una pieza', () => {
    const result = schema.safeParse(MOVIMIENTO_VACIO)
    expect(result.success).toBe(false)
    const rutas = result.error?.issues.map((issue) => issue.path.join('.'))
    expect(rutas).toEqual(expect.arrayContaining(['tipoMovimiento', 'autorizadoPor', 'cantidades']))
    expect(
      schema.safeParse({ ...MOVIMIENTO_VACIO, tipoMovimiento: 'DotacionCaja', autorizadoPor: 2, cantidades: { d4: 'x' } }).error?.issues[0].path,
    ).toEqual(['cantidades', 'd4'])
  })
})

describe('formulario de arqueo (BOV-05)', () => {
  it('arma el body con el testigo y el conteo', () => {
    expect(arqueoFormSchema.parse({ ...ARQUEO_VACIO, idUsuarioTestigo: 3, cantidades: { d1: '8', d10: '1' } })).toEqual({
      desglose: [
        { idDenominacion: 1, cantidad: 8 },
        { idDenominacion: 10, cantidad: 1 },
      ],
      tipoArqueo: 'Sorpresivo',
      idUsuarioTestigo: 3,
    })
    expect(arqueoFormSchema.safeParse(ARQUEO_VACIO).success).toBe(false)
  })
})

describe('respuestas', () => {
  const movimiento = {
    idMovimiento: 500,
    idBoveda: 1,
    tipoMovimiento: 'DotacionCaja',
    naturaleza: 'E',
    monto: 1000,
    saldoAnterior: 2000,
    saldoPosterior: 1000,
    fechaMovimiento: '2026-11-16T01:16:18.129Z',
    desglose: [{ idDenominacion: 4, cantidad: 50 }],
  }

  it('BOV-04 acepta la lista (y un objeto suelto) y siempre devuelve una lista', () => {
    expect(movimientosRegistradosSchema.parse([movimiento])).toHaveLength(1)
    expect(movimientosRegistradosSchema.parse(movimiento)).toHaveLength(1)
    expect(movimientosRegistradosSchema.safeParse([]).success).toBe(false)
  })

  it('lee el arqueo y describe su diferencia', () => {
    const arqueo = arqueoSchema.parse({
      idArqueoBoveda: 15,
      idBoveda: 1,
      fechaHoraArqueo: '2026-11-16T01:17:07.762Z',
      tipoArqueo: 'Sorpresivo',
      estado: 'REGISTRADO',
      idsMovimientosAjuste: null,
      diferenciaPorDenominacion: [{ idDenominacion: 4, cantidad: -1 }],
      saldoTeorico: 224218.48,
      saldoFisico: 224198.48,
      diferencia: -20,
    })
    expect(arqueo.idsMovimientosAjuste).toEqual([])
    expect(resultadoArqueo(arqueo)).toBe('faltante')
    expect(sinEspacios(textoDiferencia(arqueo))).toBe('Faltante de $20,00')
    expect(resultadoArqueo({ diferencia: 0.001 })).toBe('cuadra')
    expect(resultadoArqueo({ diferencia: 0.25 })).toBe('sobrante')
  })
})

describe('Idempotency-Key', () => {
  it('cumple el patrón del backend', () => {
    expect(IDEMPOTENCY_KEY_REGEX.test(nuevaClaveIdempotencia())).toBe(true)
  })

  it('se reutiliza para el mismo body y cambia si cambia el movimiento', () => {
    const body = { desglose: [{ idDenominacion: 4, cantidad: 50 }], tipoMovimiento: 'DotacionCaja' as const, autorizadoPor: 2 }
    const primero = claveParaEnvio(null, body)
    expect(claveParaEnvio(primero, { ...body })).toBe(primero)
    expect(claveParaEnvio(primero, { ...body, autorizadoPor: 3 }).clave).not.toBe(primero.clave)
  })
})
