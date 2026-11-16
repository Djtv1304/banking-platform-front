import { describe, expect, it } from 'vitest'

import type { CuentaContable } from '@/features/contabilidad/api/contabilidad.contract'
import {
  bloqueosCuenta,
  esNivelRegulador,
  estaActiva,
  etiquetaNaturaleza,
  formatearSaldo,
} from '@/features/contabilidad/lib/cuenta-contable'

const cuenta = (codigoCuenta: string, extra: Partial<CuentaContable> = {}): CuentaContable => ({
  idCuentaContable: 1,
  codigoCuenta,
  nombreCuenta: 'Cuenta',
  naturaleza: 'DEUDORA',
  tipoCuenta: 'ACTIVO',
  idCuentaSuperior: null,
  esImputable: true,
  saldo: 0,
  estado: 'Activo',
  ...extra,
})

describe('formato de una cuenta contable', () => {
  it('formatea el saldo en dólares', () => {
    expect(formatearSaldo(1234.5)).toMatch(/1\.234,50/)
  })

  it('lee el estado y la naturaleza', () => {
    expect(estaActiva({ estado: 'Activo' })).toBe(true)
    expect(estaActiva({ estado: 'Inactivo' })).toBe(false)
    expect(etiquetaNaturaleza('ACREEDORA')).toBe('Acreedora')
  })

  it('los códigos de 1, 2, 4 y 6 dígitos son del regulador', () => {
    expect(['1', '21', '2101', '210140'].every(esNivelRegulador)).toBe(true)
    expect(['210', '21014001'].some(esNivelRegulador)).toBe(false)
  })
})

describe('bloqueosCuenta', () => {
  it('un nivel del regulador no se renombra, desactiva ni elimina, pero admite subcuentas', () => {
    const b = bloqueosCuenta(cuenta('2101'), true)
    expect(b.renombrar).toMatch(/regulador/)
    expect(b.cambiarEstado).toMatch(/regulador/)
    expect(b.eliminar).toMatch(/regulador/)
    expect(b.nuevaSubcuenta).toBeNull()
  })

  it('una cuenta propia sin saldo ni subcuentas admite todo', () => {
    expect(bloqueosCuenta(cuenta('21014001'), false)).toEqual({
      nuevaSubcuenta: null,
      renombrar: null,
      cambiarEstado: null,
      eliminar: null,
    })
  })

  it('con saldo no se desactiva ni se elimina; con subcuentas no se elimina', () => {
    const conSaldo = bloqueosCuenta(cuenta('21014001', { saldo: 10 }), false)
    expect(conSaldo.cambiarEstado).toMatch(/saldo/)
    expect(conSaldo.eliminar).toMatch(/saldo/)
    expect(bloqueosCuenta(cuenta('21014001'), true).eliminar).toMatch(/subcuentas/)
  })

  it('una inactiva con saldo se puede activar, pero no recibe subcuentas', () => {
    const b = bloqueosCuenta(cuenta('21014001', { saldo: 10, estado: 'Inactivo' }), false)
    expect(b.cambiarEstado).toBeNull()
    expect(b.nuevaSubcuenta).toMatch(/inactiva/)
  })
})
