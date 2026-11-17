import { describe, expect, it } from 'vitest'

import { asientoSchema, paginaAsientosSchema } from '@/features/contabilidad/api/asientos.contract'

/* Forma de Asiento / PageAsiento en Backend/app/modules/contabilidad/schemas.py (PR #392 del backend) */
const LINEA = {
  idMovimientoContable: 11,
  idCuentaContable: 5,
  codigoCuenta: '110105',
  tipoMovimiento: 'DEBITO',
  monto: 150.5,
  idTransaccion: 77,
  idAgencia: '001',
}

const ASIENTO = {
  idAsientoContable: 3,
  numeroAsiento: 'AS-000003',
  fechaAsiento: '2026-11-16',
  idTipoAsiento: 1,
  origen: 'CAJA',
  concepto: 'Depósito en ventanilla',
  totalDebito: 150.5,
  totalCredito: 150.5,
  estado: 'CONTABILIZADO',
  idAsientoReversion: null,
  idAgencia: '001',
  detalle: [],
}

describe('asientoSchema', () => {
  it('acepta una cabecera de CON-04 con el detalle vacío y el dinero como número', () => {
    expect(asientoSchema.parse(ASIENTO).totalDebito).toBe(150.5)
  })

  it('acepta un asiento de CON-05 con sus líneas y una reversión', () => {
    const asiento = asientoSchema.parse({
      ...ASIENTO,
      idAsientoReversion: 9,
      detalle: [LINEA, { ...LINEA, idMovimientoContable: 12, tipoMovimiento: 'CREDITO', idTransaccion: null, idAgencia: null }],
    })
    expect(asiento.detalle).toHaveLength(2)
    expect(asiento.detalle[1].idTransaccion).toBeNull()
  })

  it('no rechaza un origen o un estado nuevos (texto libre en el backend)', () => {
    expect(asientoSchema.safeParse({ ...ASIENTO, origen: 'NUEVO_ORIGEN', estado: 'EN_REVISION' }).success).toBe(true)
  })

  it('rechaza el dinero como texto y las cabeceras incompletas', () => {
    expect(asientoSchema.safeParse({ ...ASIENTO, totalDebito: '150.50' }).success).toBe(false)
    expect(asientoSchema.safeParse({ ...ASIENTO, idAgencia: undefined }).success).toBe(false)
  })
})

describe('paginaAsientosSchema', () => {
  it('lee la página con su total', () => {
    const pagina = paginaAsientosSchema.parse({ items: [ASIENTO], page: 1, pageSize: 20, total: 1 })
    expect(pagina.total).toBe(1)
  })

  it('rechaza una respuesta sin items', () => {
    expect(paginaAsientosSchema.safeParse({ page: 1, pageSize: 20, total: 0 }).success).toBe(false)
  })
})
