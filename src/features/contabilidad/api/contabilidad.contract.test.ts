import { describe, expect, it } from 'vitest'

import { cuentaContableSchema } from '@/features/contabilidad/api/contabilidad.contract'

/* Forma de CuentaContable en Backend/app/modules/contabilidad/schemas.py (origin/develop, 16-nov) */
const CUENTA = {
  idCuentaContable: 5,
  codigoCuenta: '1101',
  nombreCuenta: 'Caja',
  naturaleza: 'DEUDORA',
  tipoCuenta: 'ACTIVO',
  idCuentaSuperior: 2,
  esImputable: false,
  saldo: 1500.25,
  estado: 'Activo',
}

describe('contrato de CON-03', () => {
  it('acepta una cuenta del backend', () => {
    expect(cuentaContableSchema.safeParse(CUENTA).success).toBe(true)
  })

  it('acepta el primer nivel sin superior y sin tipo de cuenta', () => {
    expect(cuentaContableSchema.safeParse({ ...CUENTA, idCuentaSuperior: null, tipoCuenta: null }).success).toBe(true)
  })

  it('rechaza un saldo en texto (Money llega como número)', () => {
    expect(cuentaContableSchema.safeParse({ ...CUENTA, saldo: '1500.25' }).success).toBe(false)
  })
})
