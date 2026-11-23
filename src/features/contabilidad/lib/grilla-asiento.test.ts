import { describe, expect, it } from 'vitest'

import type { CuentaContable } from '@/features/contabilidad/api/contabilidad.contract'
import {
  codigoDeTexto,
  cuentasElegibles,
  erroresDeLinea,
  estadoCuadre,
  focoTrasQuitar,
  grillaInicial,
  indiceDeCuentas,
  lineaVacia,
  lineasDeAsiento,
  lineasParaEnviar,
  MENSAJES_GRILLA,
  MINIMO_LINEAS,
  MOTIVOS_NO_ENVIAR,
  opcionCuenta,
  reducirGrilla,
  resumenGrilla,
  totalesDeGrilla,
  type LineaBorrador,
} from '@/features/contabilidad/lib/grilla-asiento'

const cuenta = (id: number, codigo: string, extra: Partial<CuentaContable> = {}): CuentaContable => ({
  idCuentaContable: id,
  codigoCuenta: codigo,
  nombreCuenta: `Cuenta ${codigo}`,
  naturaleza: 'DEUDORA',
  tipoCuenta: 'ACTIVO',
  idCuentaSuperior: null,
  esImputable: true,
  saldo: 0,
  estado: 'Activo',
  ...extra,
})

const PLAN = [
  cuenta(1, '1101', { esImputable: false }),
  cuenta(2, '110105'),
  cuenta(3, '210135', { naturaleza: 'ACREEDORA' }),
  cuenta(4, '110110', { estado: 'Inactivo' }),
  cuenta(5, '510410', { soloAutomatica: true }),
  cuenta(6, '1604'),
]
const INDICE = indiceDeCuentas(PLAN)

const linea = (cuentaTexto: string, debe = '', haber = ''): LineaBorrador => ({ ...lineaVacia(), cuenta: cuentaTexto, debe, haber })

describe('reducirGrilla', () => {
  it('empieza con dos líneas vacías de claves distintas', () => {
    const inicial = grillaInicial()
    expect(inicial).toHaveLength(MINIMO_LINEAS)
    expect(new Set(inicial.map(l => l.clave)).size).toBe(MINIMO_LINEAS)
  })

  it('agrega al final o justo después de una línea', () => {
    const [a, b] = grillaInicial()
    const nueva = lineaVacia()
    expect(reducirGrilla([a, b], { tipo: 'agregar', linea: nueva }).map(l => l.clave)).toEqual([a.clave, b.clave, nueva.clave])
    expect(reducirGrilla([a, b], { tipo: 'agregar', linea: nueva, despuesDe: a.clave }).map(l => l.clave)).toEqual([
      a.clave,
      nueva.clave,
      b.clave,
    ])
    expect(reducirGrilla([a, b], { tipo: 'agregar', linea: nueva, despuesDe: 'no-existe' }).at(-1)).toBe(nueva)
  })

  it('no baja de dos líneas al quitar', () => {
    const dos = grillaInicial()
    expect(reducirGrilla(dos, { tipo: 'quitar', clave: dos[0].clave })).toBe(dos)
    const tres = [...dos, lineaVacia()]
    expect(reducirGrilla(tres, { tipo: 'quitar', clave: dos[0].clave }).map(l => l.clave)).toEqual([dos[1].clave, tres[2].clave])
  })

  it('cambia sólo el campo de la línea indicada, sin mutar', () => {
    const lineas = grillaInicial()
    const copia = structuredClone(lineas)
    const despues = reducirGrilla(lineas, { tipo: 'cambiar', clave: lineas[1].clave, campo: 'haber', valor: '10' })
    expect(despues[1].haber).toBe('10')
    expect(despues[0]).toBe(lineas[0])
    expect(lineas).toEqual(copia)
  })

  it('reemplazar completa hasta el mínimo de líneas', () => {
    const una = [linea('110105', '5')]
    const resultado = reducirGrilla(grillaInicial(), { tipo: 'reemplazar', lineas: una })
    expect(resultado).toHaveLength(MINIMO_LINEAS)
    expect(resultado[0]).toBe(una[0])
  })
})

describe('focoTrasQuitar', () => {
  it('va a la siguiente, o a la anterior si se quita la última; nada si no se puede quitar', () => {
    const [a, b, c] = [lineaVacia(), lineaVacia(), lineaVacia()]
    expect(focoTrasQuitar([a, b, c], b.clave)).toBe(c.clave)
    expect(focoTrasQuitar([a, b, c], c.clave)).toBe(b.clave)
    expect(focoTrasQuitar([a, b], a.clave)).toBeNull()
    expect(focoTrasQuitar([a, b, c], 'x')).toBeNull()
  })
})

describe('cuentas', () => {
  it('sólo son elegibles las auxiliares activas que no son sólo automáticas, ordenadas por código', () => {
    expect(cuentasElegibles([...PLAN].reverse()).map(c => c.codigoCuenta)).toEqual(['110105', '1604', '210135'])
  })

  it('el código es lo primero que se escribe', () => {
    expect(codigoDeTexto(opcionCuenta(PLAN[1]))).toBe('110105')
    expect(codigoDeTexto('  110105 Caja')).toBe('110105')
    expect(codigoDeTexto('')).toBe('')
  })
})

describe('erroresDeLinea', () => {
  it('una línea vacía no tiene errores', () => {
    expect(erroresDeLinea(lineaVacia(), INDICE)).toEqual({})
  })

  it('una línea correcta no tiene errores (por código o por opción elegida)', () => {
    expect(erroresDeLinea(linea('110105', '10'), INDICE)).toEqual({})
    expect(erroresDeLinea(linea(opcionCuenta(PLAN[2]), '', '1.250,50'), INDICE)).toEqual({})
  })

  it.each([
    ['', MENSAJES_GRILLA.cuentaVacia],
    ['999999', MENSAJES_GRILLA.cuentaInexistente('999999')],
    ['1101', MENSAJES_GRILLA.cuentaDeGrupo('1101')],
    ['110110', MENSAJES_GRILLA.cuentaInactiva('110110')],
    ['510410', MENSAJES_GRILLA.cuentaSoloAutomatica('510410')],
  ])('cuenta «%s» → %s', (texto, mensaje) => {
    expect(erroresDeLinea(linea(texto, '10'), INDICE).cuenta).toBe(mensaje)
  })

  it.each([
    ['', '', MENSAJES_GRILLA.montoVacio],
    ['10', '10', MENSAJES_GRILLA.montoEnAmbos],
    ['10,123', '', MENSAJES_GRILLA.montoInvalido],
    ['', '0,00', MENSAJES_GRILLA.montoCero],
  ])('debe «%s» / haber «%s» → %s', (debe, haber, mensaje) => {
    expect(erroresDeLinea(linea('110105', debe, haber), INDICE).monto).toBe(mensaje)
  })
})

describe('totales y cuadre', () => {
  it('suma en centavos y no arrastra error de coma flotante', () => {
    const totales = totalesDeGrilla([linea('110105', '0,10'), linea('110105', '0,20'), linea('210135', '', '0,30')])
    expect(totales).toEqual({ debe: 30, haber: 30, diferencia: 0, cuadra: true })
  })

  it('un monto inválido no suma', () => {
    expect(totalesDeGrilla([linea('110105', 'abc'), linea('210135', '', '5')]).debe).toBe(0)
  })

  it('cero contra cero no cuadra', () => {
    expect(totalesDeGrilla(grillaInicial()).cuadra).toBe(false)
  })

  it('la frase dice cuánto falta y dónde', () => {
    expect(estadoCuadre(totalesDeGrilla(grillaInicial()))).toBe('Escribe los montos de las líneas.')
    expect(estadoCuadre(totalesDeGrilla([linea('', '100'), linea('', '', '40')]))).toBe('Faltan $60,00 en el haber.')
    expect(estadoCuadre(totalesDeGrilla([linea('', '1'), linea('', '', '1.001')]))).toBe('Faltan $1.000,00 en el debe.')
    expect(estadoCuadre(totalesDeGrilla([linea('', '5'), linea('', '', '5')]))).toBe('El asiento cuadra.')
  })
})

describe('resumenGrilla y lineasParaEnviar', () => {
  const cuadrado = [linea('110105', '1.250,50'), lineaVacia(), linea('210135', '', '1250.5')]

  it('un asiento cuadrado, con las líneas vacías ignoradas, se puede enviar', () => {
    const resumen = resumenGrilla(cuadrado, INDICE)
    expect(resumen).toMatchObject({ utiles: 2, motivoNoEnviar: '', puedeEnviar: true })
    expect(resumen.errores.size).toBe(0)
    expect(lineasParaEnviar(cuadrado, INDICE)).toEqual([
      { idCuentaContable: 2, tipoMovimiento: 'DEBITO', monto: 1250.5 },
      { idCuentaContable: 3, tipoMovimiento: 'CREDITO', monto: 1250.5 },
    ])
  })

  it('pide al menos dos líneas útiles', () => {
    const lineas = [linea('110105', '5'), lineaVacia()]
    expect(resumenGrilla(lineas, INDICE).motivoNoEnviar).toBe(MOTIVOS_NO_ENVIAR.pocasLineas)
    expect(lineasParaEnviar(lineas, INDICE)).toBeNull()
  })

  it('los errores ganan al descuadre y se guardan por línea', () => {
    const lineas = [linea('1101', '5'), linea('210135', '', '4')]
    const resumen = resumenGrilla(lineas, INDICE)
    expect(resumen.motivoNoEnviar).toBe(MOTIVOS_NO_ENVIAR.conErrores)
    expect(resumen.errores.get(lineas[0].clave)?.cuenta).toBe(MENSAJES_GRILLA.cuentaDeGrupo('1101'))
    expect(resumen.errores.has(lineas[1].clave)).toBe(false)
  })

  it('sin errores pero descuadrado no se envía', () => {
    const lineas = [linea('110105', '5'), linea('210135', '', '4')]
    expect(resumenGrilla(lineas, INDICE)).toMatchObject({ motivoNoEnviar: MOTIVOS_NO_ENVIAR.noCuadra, puedeEnviar: false })
    expect(lineasParaEnviar(lineas, INDICE)).toBeNull()
  })
})

describe('lineasDeAsiento', () => {
  it('reconstruye las líneas de un borrador con la opción de la cuenta y el monto en su columna', () => {
    const lineas = lineasDeAsiento(
      [
        { codigoCuenta: '110105', tipoMovimiento: 'DEBITO', monto: 1250.5 },
        { codigoCuenta: '210135', tipoMovimiento: 'credito', monto: 1250.5 },
        { codigoCuenta: '777777', tipoMovimiento: 'CREDITO', monto: 0.1 },
      ],
      INDICE,
    )
    expect(lineas.map(({ cuenta, debe, haber }) => ({ cuenta, debe, haber }))).toEqual([
      { cuenta: '110105 · Cuenta 110105', debe: '1.250,50', haber: '' },
      { cuenta: '210135 · Cuenta 210135', debe: '', haber: '1.250,50' },
      { cuenta: '777777', debe: '', haber: '0,10' },
    ])
  })

  it('ida y vuelta: lo reconstruido se envía igual', () => {
    const enviadas = lineasParaEnviar([linea('110105', '0,10'), linea('210135', '', '0,10')], INDICE)!
    const vuelta = lineasDeAsiento(
      enviadas.map(l => ({ ...l, codigoCuenta: PLAN.find(c => c.idCuentaContable === l.idCuentaContable)!.codigoCuenta })),
      INDICE,
    )
    expect(lineasParaEnviar(vuelta, INDICE)).toEqual(enviadas)
  })
})
