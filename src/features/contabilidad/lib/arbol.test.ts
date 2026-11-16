import { describe, expect, it } from 'vitest'

import type { CuentaContable } from '@/features/contabilidad/api/contabilidad.contract'
import {
  accionTeclado,
  aplanarVisibles,
  construirArbol,
  filtrarArbol,
  idsPrimerNivel,
  type NodoCuenta,
} from '@/features/contabilidad/lib/arbol'

const cuenta = (id: number, codigo: string, idSuperior: number | null, extra: Partial<CuentaContable> = {}): CuentaContable => ({
  idCuentaContable: id,
  codigoCuenta: codigo,
  nombreCuenta: `Cuenta ${codigo}`,
  naturaleza: 'DEUDORA',
  tipoCuenta: 'ACTIVO',
  idCuentaSuperior: idSuperior,
  esImputable: false,
  saldo: 0,
  estado: 'Activo',
  ...extra,
})

const PLAN = [
  cuenta(2, '2', null, { nombreCuenta: 'Pasivos' }),
  cuenta(1, '1', null, { nombreCuenta: 'Activo' }),
  cuenta(12, '12', 1, { nombreCuenta: 'Operaciones interfinancieras' }),
  cuenta(11, '11', 1, { nombreCuenta: 'Fondos disponibles' }),
  cuenta(1101, '1101', 11, { nombreCuenta: 'Caja' }),
  cuenta(110105, '110105', 1101, { nombreCuenta: 'Efectivo', esImputable: true }),
  cuenta(21, '21', 2, { nombreCuenta: 'Obligaciones con el público' }),
  cuenta(2101, '2101', 21, { nombreCuenta: 'Depósitos a la vista' }),
]

const codigos = (nodos: readonly NodoCuenta[]) => nodos.map((nodo) => nodo.cuenta.codigoCuenta)

describe('construirArbol', () => {
  it('cuelga cada cuenta de su superior y ordena los hermanos por código', () => {
    const { raices, porId } = construirArbol(PLAN)
    expect(codigos(raices)).toEqual(['1', '2'])
    expect(codigos(raices[0].hijos)).toEqual(['11', '12'])
    expect(porId.get(110105)).toMatchObject({ nivel: 4, idPadre: 1101 })
    expect(porId.size).toBe(PLAN.length)
  })

  it('sube al primer nivel las huérfanas y las que se apuntan a sí mismas', () => {
    const { raices } = construirArbol([...PLAN, cuenta(99, '9901', 9999), cuenta(98, '98', 98)])
    expect(codigos(raices)).toEqual(['1', '2', '98', '9901'])
  })

  it('corta los ciclos sin perder ni repetir cuentas', () => {
    const ciclo = [cuenta(1, '7', 3), cuenta(2, '71', 1), cuenta(3, '7101', 2), cuenta(4, '710101', 3)]
    const { raices, porId } = construirArbol(ciclo)
    expect(codigos(raices)).toEqual(['7'])
    expect(porId.size).toBe(4)
    expect(porId.get(4)).toMatchObject({ nivel: 4, idPadre: 3 })
  })

  it('una lista vacía da un árbol vacío', () => {
    expect(construirArbol([]).raices).toEqual([])
  })
})

describe('filtrarArbol', () => {
  const { raices } = construirArbol(PLAN)

  it('sin filtro no filtra', () => {
    expect(filtrarArbol(raices, { texto: '  ', soloImputables: false })).toBeNull()
  })

  it('busca por nombre sin tildes y abre los ancestros de cada coincidencia', () => {
    const r = filtrarArbol(raices, { texto: 'depositos', soloImputables: false })
    expect([...(r?.coincidencias ?? [])]).toEqual([2101])
    expect([...(r?.abiertos ?? [])].sort()).toEqual([2, 21])
    expect(r?.visibles.has(1)).toBe(false)
  })

  it('busca por el inicio del código ignorando puntos', () => {
    const r = filtrarArbol(raices, { texto: '1.101', soloImputables: false })
    expect([...(r?.coincidencias ?? [])].sort()).toEqual([1101, 110105])
  })

  it('solo imputables', () => {
    const r = filtrarArbol(raices, { texto: '', soloImputables: true })
    expect([...(r?.coincidencias ?? [])]).toEqual([110105])
    expect([...(r?.abiertos ?? [])].sort((a, b) => a - b)).toEqual([1, 11, 1101])
  })
})

describe('aplanarVisibles', () => {
  const { raices } = construirArbol(PLAN)

  it('arranca con el primer nivel abierto y no entra en las ramas cerradas', () => {
    const filas = aplanarVisibles(raices, idsPrimerNivel(raices), null)
    expect(filas.map((f) => f.nodo.cuenta.codigoCuenta)).toEqual(['1', '11', '12', '2', '21'])
    expect(filas[1]).toMatchObject({ posicion: 1, total: 2, tieneHijos: true, abierto: false })
    expect(filas[2].tieneHijos).toBe(false)
  })

  it('con filtro muestra solo las visibles', () => {
    const filtro = filtrarArbol(raices, { texto: 'efectivo', soloImputables: false })
    const filas = aplanarVisibles(raices, filtro?.abiertos ?? new Set(), filtro?.visibles ?? null)
    expect(filas.map((f) => f.nodo.cuenta.codigoCuenta)).toEqual(['1', '11', '1101', '110105'])
    expect(filas[1]).toMatchObject({ posicion: 1, total: 1 })
  })
})

describe('accionTeclado', () => {
  const { raices } = construirArbol(PLAN)
  const filas = aplanarVisibles(raices, new Set([1, 11]), null)
  // 1, 11, 1101, 12, 2

  it('↑/↓, Inicio y Fin mueven el foco', () => {
    expect(accionTeclado(filas, 11, 'ArrowDown')).toEqual({ tipo: 'enfocar', id: 1101 })
    expect(accionTeclado(filas, 11, 'ArrowUp')).toEqual({ tipo: 'enfocar', id: 1 })
    expect(accionTeclado(filas, 2, 'ArrowDown')).toBeNull()
    expect(accionTeclado(filas, 1101, 'Home')).toEqual({ tipo: 'enfocar', id: 1 })
    expect(accionTeclado(filas, 1, 'End')).toEqual({ tipo: 'enfocar', id: 2 })
  })

  it('→ abre una rama cerrada o baja a su primer hijo', () => {
    expect(accionTeclado(filas, 1101, 'ArrowRight')).toEqual({ tipo: 'abrir', id: 1101 })
    expect(accionTeclado(filas, 11, 'ArrowRight')).toEqual({ tipo: 'enfocar', id: 1101 })
    expect(accionTeclado(filas, 12, 'ArrowRight')).toBeNull()
  })

  it('← cierra una rama abierta o sube al padre', () => {
    expect(accionTeclado(filas, 11, 'ArrowLeft')).toEqual({ tipo: 'cerrar', id: 11 })
    expect(accionTeclado(filas, 1101, 'ArrowLeft')).toEqual({ tipo: 'enfocar', id: 11 })
    expect(accionTeclado(filas, 2, 'ArrowLeft')).toBeNull()
  })

  it('Intro y Espacio seleccionan; otras teclas no hacen nada', () => {
    expect(accionTeclado(filas, 12, 'Enter')).toEqual({ tipo: 'seleccionar', id: 12 })
    expect(accionTeclado(filas, 12, ' ')).toEqual({ tipo: 'seleccionar', id: 12 })
    expect(accionTeclado(filas, 12, 'a')).toBeNull()
    expect(accionTeclado(filas, 999, 'ArrowDown')).toBeNull()
  })
})
