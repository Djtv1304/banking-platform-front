import { describe, expect, it } from 'vitest'

import { aCsv, type ColumnaCsv } from '@/shared/lib/csv'

interface Fila {
  nombre: string | null | undefined
  monto: number
}

const columnas: ColumnaCsv<Fila>[] = [
  { titulo: 'Nombre', valor: (f) => f.nombre },
  { titulo: 'Monto', valor: (f) => f.monto },
]

describe('aCsv', () => {
  it('escribe la cabecera con los títulos, separa con ; y las filas con \\r\\n', () => {
    const texto = aCsv(columnas, [
      { nombre: 'Ana', monto: 10.5 },
      { nombre: 'Luis', monto: -3 },
    ])
    expect(texto).toBe('Nombre;Monto\r\nAna;10.5\r\nLuis;-3')
  })

  it('sin filas devuelve sólo la cabecera', () => {
    expect(aCsv(columnas, [])).toBe('Nombre;Monto')
  })

  it('pone comillas con ;, comillas dobles y saltos de línea, duplicando las comillas', () => {
    const texto = aCsv(columnas, [
      { nombre: 'a;b', monto: 1 },
      { nombre: 'dice "hola"', monto: 2 },
      { nombre: 'línea 1\nlínea 2', monto: 3 },
    ])
    expect(texto).toBe('Nombre;Monto\r\n"a;b";1\r\n"dice ""hola""";2\r\n"línea 1\nlínea 2";3')
  })

  it('null y undefined quedan vacíos, y los acentos pasan tal cual', () => {
    const texto = aCsv(columnas, [
      { nombre: null, monto: 1 },
      { nombre: undefined, monto: 2 },
      { nombre: 'Ñandú', monto: 3 },
    ])
    expect(texto).toBe('Nombre;Monto\r\n;1\r\n;2\r\nÑandú;3')
  })

  it('protege contra inyección de fórmulas en textos', () => {
    const una = (nombre: string) => aCsv<Fila>([{ titulo: 'N', valor: (f) => f.nombre }], [{ nombre, monto: 0 }]).slice('N\r\n'.length)
    expect(una('=1+1')).toBe(`'=1+1`)
    expect(una('+SUMA(A1)')).toBe(`'+SUMA(A1)`)
    expect(una('-2+3')).toBe(`'-2+3`)
    expect(una('@cmd')).toBe(`'@cmd`)
    expect(una('\tdato')).toBe(`'\tdato`)
    expect(una('\rdato')).toBe(`"'\rdato"`)
  })

  it('combina inyección y comillas, y protege también los títulos', () => {
    const texto = aCsv<Fila>([{ titulo: '=Título', valor: (f) => f.nombre }], [{ nombre: '=A;B', monto: 0 }])
    expect(texto).toBe(`'=Título\r\n"'=A;B"`)
  })

  it('no toca los números negativos ni los textos que no empiezan por un disparador', () => {
    const texto = aCsv(columnas, [{ nombre: 'a-b=c@d', monto: -7.25 }])
    expect(texto).toBe('Nombre;Monto\r\na-b=c@d;-7.25')
  })

  it('no incluye el BOM', () => {
    expect(aCsv(columnas, [{ nombre: 'x', monto: 1 }]).startsWith('﻿')).toBe(false)
  })
})
