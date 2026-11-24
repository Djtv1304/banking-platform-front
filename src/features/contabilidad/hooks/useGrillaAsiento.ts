import { useMemo, useReducer } from 'react'

import type { CuentaContable } from '@/features/contabilidad/api/contabilidad.contract'
import {
  cuentasElegibles,
  grillaInicial,
  indiceDeCuentas,
  reducirGrilla,
  resumenGrilla,
  type LineaBorrador,
} from '@/features/contabilidad/lib/grilla-asiento'

/** E4-04 · Estado de la grilla de un asiento manual: líneas, cuentas elegibles y cuadre */
export function useGrillaAsiento(plan: readonly CuentaContable[], iniciales?: LineaBorrador[]) {
  const [lineas, despachar] = useReducer(reducirGrilla, iniciales, valor => (valor?.length ? reducirGrilla([], { tipo: 'reemplazar', lineas: valor }) : grillaInicial()))
  const indice = useMemo(() => indiceDeCuentas(plan), [plan])
  const elegibles = useMemo(() => cuentasElegibles(plan), [plan])
  const resumen = useMemo(() => resumenGrilla(lineas, indice), [lineas, indice])
  return { lineas, despachar, indice, elegibles, resumen }
}

export type EstadoGrillaAsiento = ReturnType<typeof useGrillaAsiento>
