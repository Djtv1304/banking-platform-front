import { describe, expect, it } from 'vitest'

import type { TasaInteres } from '@/features/catalogos'
import type { ProductoAdmin } from '@/features/organizacion/api/productos.contract'
import { marcarComision, marcarSeguro, tasasPermitidas, VINCULOS_VACIOS } from '@/features/organizacion/lib/vinculos'

const tasa = (id: number, tipoTasa: TasaInteres['tipoTasa'], idTipoCredito: number | null = null): TasaInteres => ({
  idTasaInteres: id,
  tipoTasa,
  idTipoCredito,
  tasaNominalAnual: 0.1,
  recargoMoraSobreTasa: 0,
  vigenciaDesde: '2026-01-01',
  vigente: true,
})
const TASAS = [tasa(1, 'CREDITO', 1), tasa(2, 'CREDITO', 2), tasa(3, 'AHORRO'), tasa(4, 'TARJETA_COMPRA'), tasa(5, 'TARJETA_EXTERIOR')]
const producto = (tipoProducto: ProductoAdmin['tipoProducto'], idTipoCredito: number | null = null) =>
  ({ tipoProducto, idTipoCredito }) as ProductoAdmin

describe('vínculos', () => {
  it('cada tipo de producto solo ve sus tasas', () => {
    expect(tasasPermitidas(producto('Credito', 1), TASAS).map((t) => t.idTasaInteres)).toEqual([1])
    expect(tasasPermitidas(producto('Cuenta'), TASAS).map((t) => t.idTasaInteres)).toEqual([3])
    expect(tasasPermitidas(producto('Tarjeta'), TASAS).map((t) => t.idTasaInteres)).toEqual([4, 5])
  })

  it('una comisión se marca, se exonera o se quita sin repetirse', () => {
    let v = marcarComision(VINCULOS_VACIOS, 1, true)
    v = marcarComision(v, 1, true, true)
    expect(v.comisiones).toEqual([{ idComision: 1, exonerado: true }])
    expect(marcarComision(v, 1, false).comisiones).toEqual([])
  })

  it('un seguro puede ser obligatorio', () => {
    expect(marcarSeguro(VINCULOS_VACIOS, 2, true, true).seguros).toEqual([{ idSeguro: 2, esObligatorio: true }])
  })
})
