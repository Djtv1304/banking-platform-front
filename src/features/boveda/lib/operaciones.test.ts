import { describe, expect, it } from 'vitest'

import {
  accionesSolicitudSchema,
  arqueoSchema,
  crearSolicitudMovimientoSchema,
  IDEMPOTENCY_KEY_REGEX,
  motivoResolucionSchema,
  movimientoBovedaSchema,
  paginaArqueosSchema,
  solicitudMovimientoSchema,
} from '@/features/boveda/api/bovedas.contract'
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
    expect(leerCantidad('1.2')).toBeNull()
    expect(leerCantidad('1.250.000')).toBe(1250000)
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

describe('formulario de solicitud de movimiento (SMV-01)', () => {
  const schema = movimientoFormSchema(1)

  it('arma el body sin contraparte, autorizador ni observaciones vacías', () => {
    const body = schema.parse({ ...MOVIMIENTO_VACIO, tipoMovimiento: 'EnvioExcedente', observaciones: '  ', cantidades: { d4: '50' } })
    expect(body).toEqual({ desglose: [{ idDenominacion: 4, cantidad: 50 }], tipoMovimiento: 'EnvioExcedente' })
    expect(crearSolicitudMovimientoSchema.safeParse(body).success).toBe(true)
    expect(crearSolicitudMovimientoSchema.safeParse({ ...body, autorizadoPor: 2 }).success).toBe(false)
  })

  it('un traslado exige otra bóveda', () => {
    const base = { ...MOVIMIENTO_VACIO, tipoMovimiento: 'Traslado' as const, cantidades: { d4: '1' } }
    expect(schema.safeParse(base).success).toBe(false)
    expect(schema.safeParse({ ...base, idBovedaContraparte: '1' }).success).toBe(false)
    expect(schema.parse({ ...base, idBovedaContraparte: '2' })).toMatchObject({ idBovedaContraparte: 2 })
  })

  it('pide tipo y al menos una pieza', () => {
    const result = schema.safeParse(MOVIMIENTO_VACIO)
    expect(result.success).toBe(false)
    const rutas = result.error?.issues.map((issue) => issue.path.join('.'))
    expect(rutas).toEqual(['tipoMovimiento', 'cantidades'])
    expect(
      schema.safeParse({ ...MOVIMIENTO_VACIO, tipoMovimiento: 'EnvioExcedente', cantidades: { d4: 'x' } }).error?.issues[0].path,
    ).toEqual(['cantidades', 'd4'])
  })
})

describe('formulario de arqueo (BOV-05)', () => {
  it('arma el body con el cajero responsable y permite un conteo de cero', () => {
    expect(arqueoFormSchema.parse({ ...ARQUEO_VACIO, idUsuarioResponsable: '3', cantidades: { d1: '8', d10: '1' } })).toEqual({
      desglose: [
        { idDenominacion: 1, cantidad: 8 },
        { idDenominacion: 10, cantidad: 1 },
      ],
      tipoArqueo: 'Sorpresivo',
      idUsuarioResponsable: 3,
    })
    expect(arqueoFormSchema.parse(ARQUEO_VACIO)).toEqual({ tipoArqueo: 'Sorpresivo', desglose: [] })
    expect(arqueoFormSchema.safeParse({ ...ARQUEO_VACIO, idUsuarioResponsable: '0' }).success).toBe(false)
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

  it('BOV-03 lee la solicitud que originó el movimiento', () => {
    expect(movimientoBovedaSchema.parse({ ...movimiento, idSolicitudMovimiento: 77 }).idSolicitudMovimiento).toBe(77)
    expect(movimientoBovedaSchema.parse(movimiento).idSolicitudMovimiento).toBeUndefined()
  })

  it('envía el conteo real y exige el acta de un retorno', () => {
    expect(accionesSolicitudSchema.parse({ accion: 'recepcion', datos: { desglose: [], actaNovedad: 'ACTA-123' } })).toEqual({
      accion: 'recepcion', datos: { desglose: [], actaNovedad: 'ACTA-123' },
    })
    expect(accionesSolicitudSchema.safeParse({ accion: 'devolucion', datos: { desglose: [] } }).success).toBe(false)
    expect(accionesSolicitudSchema.safeParse({ accion: 'aprobacion', datos: { monto: 12 } }).success).toBe(false)
  })

  it('lee la solicitud con nulos y desglose con valor unitario', () => {
    const solicitud = solicitudMovimientoSchema.parse({
      idSolicitudMovimiento: 9,
      idBoveda: 1,
      idBovedaContraparte: null,
      idAgencia: '001',
      tipoMovimiento: 'DotacionCaja',
      monto: 1000,
      idUsuarioSolicitante: 4,
      fechaSolicitud: '2026-11-18T18:11:06.553Z',
      estado: 'PENDIENTE',
      observaciones: null,
      idUsuarioResolucion: null,
      fechaResolucion: null,
      motivoResolucion: null,
      desglose: [{ idDenominacion: 4, cantidad: 50, valorUnitario: 20 }],
      idsMovimientos: null,
    })
    expect(solicitud.idsMovimientos).toEqual([])
    expect(solicitud.desglose[0].valorUnitario).toBe(20)
  })

  it('SMV-05 y SMV-06 exigen un motivo con texto', () => {
    expect(motivoResolucionSchema.safeParse({ motivo: '   ' }).success).toBe(false)
    expect(motivoResolucionSchema.parse({ motivo: ' Límite excedido ' })).toEqual({ motivo: 'Límite excedido' })
  })

  it('BOV-07 lee arqueos sin diferencia por denominación', () => {
    const pagina = paginaArqueosSchema.parse({
      items: [
        {
          idArqueoBoveda: 3,
          idBoveda: 1,
          fechaHoraArqueo: '2026-11-18T18:26:36.612Z',
          tipoArqueo: 'Programado',
          estado: 'APROBADO',
          saldoTeorico: null,
          saldoFisico: null,
          diferencia: null,
          idsMovimientosAjuste: [],
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    })
    expect(pagina.items[0].diferenciaPorDenominacion).toEqual([])
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
    expect(resultadoArqueo({ diferencia: null })).toBe('sin-dato')
    expect(textoDiferencia({ diferencia: null })).toBe('Diferencia no registrada')
  })
})

describe('Idempotency-Key', () => {
  it('cumple el patrón del backend', () => {
    expect(IDEMPOTENCY_KEY_REGEX.test(nuevaClaveIdempotencia())).toBe(true)
  })

  it('se reutiliza para el mismo body y cambia si cambia la solicitud', () => {
    const body = { desglose: [{ idDenominacion: 4, cantidad: 50 }], tipoMovimiento: 'EnvioExcedente' as const }
    const primero = claveParaEnvio(null, body)
    expect(claveParaEnvio(primero, { ...body })).toBe(primero)
    expect(claveParaEnvio(primero, { ...body, observaciones: 'Caja 3' }).clave).not.toBe(primero.clave)
  })
})
