import { describe, expect, it } from 'vitest'

import type { CuentaContable } from '@/features/contabilidad/api/contabilidad.contract'
import type { AsignacionCuenta, ClaseCuenta } from '@/features/contabilidad/api/cuentas-producto.contract'
import {
  asignacionVigente,
  cuentasCandidatas,
  descripcionClase,
  excepciones,
  grupoClase,
  manana,
  pestanas,
} from '@/features/contabilidad/lib/cuentas-producto'

const clase = (cambios: Partial<ClaseCuenta>): ClaseCuenta => ({
  idClase: 1,
  idTipoProducto: 1,
  codigoTipoProducto: 'CUENTA_AHORRO',
  idTipoCredito: null,
  codigoTipoCredito: null,
  codigoRol: 'CAPITAL',
  nombreRol: 'Capital',
  situacion: null,
  condicion: null,
  tramo: null,
  cuentaBase: '210135',
  nombreCuentaBase: 'Depósitos de ahorro',
  nivel: 'PRODUCTO',
  obligatorio: true,
  soloConTasa: false,
  ...cambios,
})

const cuenta = (id: number, codigo: string, superior: number | null, imputable = true): CuentaContable => ({
  idCuentaContable: id,
  codigoCuenta: codigo,
  nombreCuenta: codigo,
  naturaleza: 'ACREEDORA',
  tipoCuenta: 'PASIVO',
  idCuentaSuperior: superior,
  esImputable: imputable,
  saldo: 0,
  estado: 'Activo',
})

const asignacion = (cambios: Partial<AsignacionCuenta>): AsignacionCuenta => ({
  idCuentaProducto: 1,
  idClase: 1,
  idProducto: null,
  codigoProducto: null,
  idSubProducto: null,
  codigoSubProducto: null,
  idCuentaContable: 10,
  codigoCuenta: '2105',
  nombreCuenta: 'Depósitos restringidos',
  vigenciaDesde: '2026-01-01',
  vigenciaHasta: null,
  idSolicitud: null,
  ...cambios,
})

describe('cuentas por producto', () => {
  it('arma una pestaña por tipo y separa el crédito por tipo de crédito', () => {
    const lista = pestanas([
      clase({}),
      clase({ idClase: 2, codigoRol: 'RESTRINGIDO' }),
      clase({ idClase: 3, idTipoProducto: 4, codigoTipoProducto: 'CREDITO', idTipoCredito: 1, codigoTipoCredito: 'CONSUMO' }),
      clase({ idClase: 4, idTipoProducto: 4, codigoTipoProducto: 'CREDITO', idTipoCredito: 2, codigoTipoCredito: 'MICRO' }),
    ])
    expect(lista.map((p) => p.etiqueta)).toEqual(['Cuenta de ahorro', 'Crédito de consumo', 'Microcrédito'])
  })

  it('describe la cartera por condición, situación y tramo', () => {
    const k = clase({ codigoRol: 'CARTERA', nombreRol: 'Cartera de créditos', condicion: 'REFINANCIADA', situacion: 'VENCIDA', tramo: 2, nombreCuentaBase: 'De 31 a 90 días' })
    expect(descripcionClase(k)).toBe('Cartera de créditos refinanciada vencida · De 31 a 90 días')
    expect(grupoClase(k)).toBe('Cartera de créditos refinanciada vencida')
    expect(grupoClase(clase({ codigoRol: 'CONTRA_CASTIGO' }))).toBe('Cuentas de orden y contingentes')
  })

  it('solo ofrece cuentas activas, imputables, del último nivel y bajo la base', () => {
    const plan = [
      cuenta(1, '210135', null, false),
      cuenta(2, '21013505', 1),
      cuenta(3, '21013510', 1),
      cuenta(4, '2101350501', 2),
      cuenta(5, '210140', null),
      { ...cuenta(6, '21013599', 1), estado: 'Inactivo' },
    ]
    expect(cuentasCandidatas(plan, '210135').map((c) => c.codigoCuenta)).toEqual(['2101350501', '21013510'])
    expect(cuentasCandidatas([cuenta(9, '2105', null)], '2105').map((c) => c.codigoCuenta)).toEqual(['2105'])
  })

  it('elige la asignación vigente del alcance y reconoce las excepciones', () => {
    const tipo = asignacion({})
    const propia = asignacion({ idCuentaProducto: 2, idSubProducto: 7, codigoSubProducto: 'AHO001-PJ' })
    const futura = asignacion({ idCuentaProducto: 3, vigenciaDesde: '2099-01-01' })
    const lista = [tipo, propia, futura]
    expect(asignacionVigente(lista, 1, { nivel: 'TIPO' }, '2026-11-20')).toBe(tipo)
    expect(asignacionVigente(lista, 1, { nivel: 'SUBPRODUCTO', id: 7 }, '2026-11-20')).toBe(propia)
    expect(excepciones(lista, [clase({ nivel: 'TIPO' })])).toEqual([propia])
  })

  it('propone mañana en hora de Ecuador', () => {
    expect(manana(new Date('2026-11-21T03:00:00Z'))).toBe('2026-11-21')
    expect(manana(new Date('2026-11-21T06:00:00Z'))).toBe('2026-11-22')
  })
})
