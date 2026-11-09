import { describe, expect, it } from 'vitest'

import {
  armarParametros,
  FILTROS_VACIOS,
  filtrosTarjetasSchema,
  leerId,
  PAGE_SIZE,
  resumenPaginacion,
  totalPaginas,
} from '@/features/tarjetas/lib/consulta'

describe('leerId', () => {
  it('acepta enteros positivos', () => {
    expect(leerId('1')).toBe(1)
    expect(leerId(' 42 ')).toBe(42)
    expect(leerId('2147483647')).toBe(2_147_483_647)
  })

  it.each([undefined, '', '0', '-3', '1.5', '1e3', 'abc', '12a', '2147483648'])('rechaza %j', (valor) => {
    expect(leerId(valor)).toBeNull()
  })
})

describe('filtrosTarjetasSchema', () => {
  it('acepta todos los filtros vacíos', () => {
    expect(filtrosTarjetasSchema.safeParse(FILTROS_VACIOS).success).toBe(true)
  })

  it('acepta ids y un estado de la lista', () => {
    const result = filtrosTarjetasSchema.parse({ idCliente: ' 7 ', idCuenta: '12', estado: 'Bloqueada' })
    expect(result).toEqual({ idCliente: '7', idCuenta: '12', estado: 'Bloqueada' })
  })

  it.each(['0', '-1', '3.5', 'abc', '99999999999'])('rechaza el id %j', (valor) => {
    const result = filtrosTarjetasSchema.safeParse({ ...FILTROS_VACIOS, idCuenta: valor })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toEqual(['idCuenta'])
  })

  it('rechaza un estado fuera de la lista', () => {
    expect(filtrosTarjetasSchema.safeParse({ ...FILTROS_VACIOS, estado: 'Suspendida' }).success).toBe(false)
  })
})

describe('armarParametros', () => {
  it('sin filtros solo envía la página', () => {
    expect(armarParametros(FILTROS_VACIOS, 1)).toEqual({ page: '1', pageSize: String(PAGE_SIZE) })
  })

  it('combina los filtros y no envía los vacíos', () => {
    expect(armarParametros({ idCliente: '7', idCuenta: '', estado: 'Activa' }, 3)).toEqual({
      page: '3',
      pageSize: '20',
      idCliente: '7',
      estado: 'Activa',
    })
    expect(armarParametros({ idCliente: '7', idCuenta: '12', estado: 'Activa' }, 1)).toEqual({
      page: '1',
      pageSize: '20',
      idCliente: '7',
      idCuenta: '12',
      estado: 'Activa',
    })
  })
})

describe('paginación', () => {
  it('calcula las páginas y el resumen', () => {
    expect(totalPaginas(45)).toBe(3)
    expect(totalPaginas(0)).toBe(0)
    expect(resumenPaginacion(2, 45)).toBe('Página 2 de 3 · 45 resultados')
    expect(resumenPaginacion(1, 1)).toBe('Página 1 de 1 · 1 resultado')
  })
})
