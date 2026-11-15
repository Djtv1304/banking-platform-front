import type { TasaInteres, TipoTasa } from '@/features/catalogos'
import type { ProductoAdmin, TipoProductoAdmin, Vinculos } from '@/features/organizacion/api/productos.contract'

/* Reglas del checklist de vínculos: las mismas que valida el backend (productos/vinculos.py). */

const TASAS_POR_TIPO: Record<TipoProductoAdmin, readonly TipoTasa[]> = {
  Credito: ['CREDITO'],
  Cuenta: ['AHORRO'],
  Tarjeta: ['TARJETA_COMPRA', 'TARJETA_AVANCE', 'TARJETA_DIFERIDO', 'TARJETA_EXTERIOR', 'TARJETA_MORA'],
}

/** Tasas que puede vincular el producto: las de su tipo (y de su tipo de crédito, si es crédito) */
export function tasasPermitidas(producto: ProductoAdmin, tasas: readonly TasaInteres[]) {
  return tasas.filter(
    (t) =>
      TASAS_POR_TIPO[producto.tipoProducto].includes(t.tipoTasa) &&
      (producto.tipoProducto !== 'Credito' || t.idTipoCredito === producto.idTipoCredito),
  )
}

export const VINCULOS_VACIOS: Vinculos = { tasasInteres: [], comisiones: [], seguros: [], sistemasAmortizacion: [] }

/** Copia sin la herencia: es lo que se envía en el PUT */
export const soloPropios = (v: Vinculos): Vinculos => ({
  tasasInteres: [...v.tasasInteres],
  comisiones: v.comisiones.map((c) => ({ ...c })),
  seguros: v.seguros.map((s) => ({ ...s })),
  sistemasAmortizacion: [...v.sistemasAmortizacion],
})

/** Marca o desmarca un id sin repetirlo */
export function alternar<T>(lista: readonly T[], valor: T, marcado: boolean): T[] {
  const sin = lista.filter((v) => v !== valor)
  return marcado ? [...sin, valor] : sin
}

/**
 * Comisión en el checklist del subproducto:
 * - heredada del producto: se puede exonerar (vínculo propio con exonerado = true);
 * - propia: se marca o desmarca.
 */
export function marcarComision(v: Vinculos, idComision: number, marcado: boolean, exonerado = false): Vinculos {
  const resto = v.comisiones.filter((c) => c.idComision !== idComision)
  return { ...v, comisiones: marcado ? [...resto, { idComision, exonerado }] : resto }
}

export function marcarSeguro(v: Vinculos, idSeguro: number, marcado: boolean, esObligatorio = false): Vinculos {
  const resto = v.seguros.filter((s) => s.idSeguro !== idSeguro)
  return { ...v, seguros: marcado ? [...resto, { idSeguro, esObligatorio }] : resto }
}
