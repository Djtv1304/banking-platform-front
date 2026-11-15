import { describe, expect, it } from 'vitest'

import type { CampoCatalogo, RegistroCatalogo } from '@/features/catalogos/api/catalogos.contract'
import { aTexto, cambiosRegistro, filtrarRegistros, leerCampo, mostrar } from '@/features/catalogos/lib/registro-form'

const campo = (c: Partial<CampoCatalogo>): CampoCatalogo => ({
  nombre: 'x',
  etiqueta: 'X',
  tipo: 'texto',
  editable: true,
  nulo: false,
  ...c,
})

const tasa = campo({ nombre: 'tasaNominalAnual', tipo: 'porcentaje' })
const nombre = campo({ nombre: 'nombre', maximo: 10 })
const maximo = campo({ nombre: 'montoMaximo', tipo: 'dinero', nulo: true })
const fila: RegistroCatalogo = { id: '1', estado: 'A', tasaNominalAnual: 0.16, nombre: 'Consumo', montoMaximo: 20000 }

describe('edición de un registro de catálogo', () => {
  it('los porcentajes se escriben en % y viajan como fracción', () => {
    expect(aTexto(tasa, 0.16)).toBe('16')
    expect(leerCampo(tasa, '15.5')).toEqual({ valor: 0.155 })
    expect(leerCampo(tasa, '0')).toHaveProperty('error')
    expect(leerCampo(tasa, '101')).toHaveProperty('error')
  })

  it('valida texto, montos y vacíos', () => {
    expect(leerCampo(nombre, '  Consumo  ')).toEqual({ valor: 'Consumo' })
    expect(leerCampo(nombre, 'demasiado largo')).toHaveProperty('error')
    expect(leerCampo(nombre, '')).toHaveProperty('error')
    expect(leerCampo(maximo, '')).toEqual({ valor: null })
    expect(leerCampo(maximo, '10,000')).toHaveProperty('error')
  })

  it('envía solo lo que cambió', () => {
    const entradas = { tasaNominalAnual: '16', nombre: 'Consumo', montoMaximo: '10000' }
    expect(cambiosRegistro([tasa, nombre, maximo], fila, entradas)).toEqual({ body: { montoMaximo: 10000 } })
    expect(cambiosRegistro([tasa, nombre, maximo], fila, { ...entradas, nombre: '' })).toEqual({
      errores: { nombre: 'Es obligatorio.' },
    })
  })

  it('muestra montos, porcentajes y booleanos', () => {
    expect(mostrar(tasa, 0.16)).toBe('16 %')
    expect(mostrar(maximo, null)).toBe('—')
    expect(mostrar(campo({ tipo: 'booleano' }), true)).toBe('Sí')
  })

  it('el buscador ignora tildes y mayúsculas', () => {
    expect(filtrarRegistros([fila, { ...fila, id: '2', nombre: 'Microcrédito' }], 'CREDITO')).toHaveLength(1)
  })
})

it('valor de comisión o seguro: número >= 0 con hasta 6 decimales', () => {
  const valor = campo({ nombre: 'valor', tipo: 'numero' })
  expect(leerCampo(valor, '0.45')).toEqual({ valor: 0.45 })
  expect(leerCampo(valor, '0.050000')).toEqual({ valor: 0.05 })
  expect(leerCampo(valor, '-1')).toHaveProperty('error')
  expect(mostrar(valor, 0.45)).toBe('0,45')
})
