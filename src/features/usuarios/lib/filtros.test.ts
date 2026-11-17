import { describe, expect, it } from 'vitest'

import {
  armarParametros,
  FILTROS_VACIOS,
  filtrosUsuariosSchema,
  filtrosDesdeRol,
  ORDEN_INICIAL,
  resumenPaginacion,
  siguienteOrden,
} from '@/features/usuarios/lib/filtros'

describe('filtro inicial desde Roles y accesos', () => {
  it('precarga solo el rol reconocido, sin nombres ni correos', () => {
    expect(filtrosDesdeRol('ASESOR')).toEqual({ ...FILTROS_VACIOS, rol: 'ASESOR' })
    expect(armarParametros(filtrosDesdeRol('ASESOR'), ORDEN_INICIAL, 1)).toEqual({ page: '1', pageSize: '20', rol: 'ASESOR' })
  })
  it.each([null, '', 'NO_EXISTE', 'ASESOR&estado=Activo'])('descarta un rol inválido: %s', (rol) => {
    expect(filtrosDesdeRol(rol)).toEqual(FILTROS_VACIOS)
  })
})

describe('armarParametros', () => {
  it('sin filtros envía solo la página y el tamaño, sin el orden por defecto', () => {
    expect(armarParametros(FILTROS_VACIOS, ORDEN_INICIAL, 1)).toEqual({ page: '1', pageSize: '20' })
  })

  it('envía solo los filtros con valor y el orden elegido', () => {
    const params = armarParametros(
      { q: '  tapia ', estado: 'Inactivo', rol: 'CAJERO', idAgencia: '001', vinculado: 'false' },
      { campo: 'username', direccion: 'asc' },
      3,
    )
    expect(params).toEqual({
      page: '3',
      pageSize: '20',
      q: 'tapia',
      estado: 'Inactivo',
      rol: 'CAJERO',
      idAgencia: '001',
      vinculado: 'false',
      sort: 'username,asc',
    })
  })
})

describe('siguienteOrden', () => {
  it('invierte la dirección al repetir la columna', () => {
    expect(siguienteOrden(ORDEN_INICIAL, 'fechaCreacion')).toEqual({ campo: 'fechaCreacion', direccion: 'asc' })
  })

  it('una columna nueva empieza A→Z, y la fecha en «más recientes»', () => {
    expect(siguienteOrden(ORDEN_INICIAL, 'email')).toEqual({ campo: 'email', direccion: 'asc' })
    expect(siguienteOrden({ campo: 'email', direccion: 'asc' }, 'fechaCreacion')).toEqual(ORDEN_INICIAL)
  })
})

describe('filtrosUsuariosSchema', () => {
  it('rechaza una búsqueda de más de 100 caracteres y una agencia que no son 3 dígitos', () => {
    expect(filtrosUsuariosSchema.safeParse({ ...FILTROS_VACIOS, q: 'a'.repeat(101) }).success).toBe(false)
    expect(filtrosUsuariosSchema.safeParse({ ...FILTROS_VACIOS, idAgencia: '01' }).success).toBe(false)
  })
})

it('resume la paginación en singular y plural', () => {
  expect(resumenPaginacion(1, 1)).toBe('Página 1 de 1 · 1 usuario')
  expect(resumenPaginacion(2, 45)).toBe('Página 2 de 3 · 45 usuarios')
  expect(resumenPaginacion(1, 0)).toBe('Página 1 de 1 · 0 usuarios')
})
