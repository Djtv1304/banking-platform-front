import { describe, expect, it } from 'vitest'

import { catalogoAdministrableSchema, registroCatalogoSchema } from '@/features/catalogos/api/catalogos.contract'

/* Forma real de GET /catalogos/administracion (respuesta del backend del 2026-11-15) */
const TIPOS_DEL_BACKEND = ['booleano', 'dinero', 'entero', 'fecha', 'numero', 'porcentaje', 'texto']

describe('contrato de administración de catálogos', () => {
  it('acepta todos los tipos de campo que envía el backend', () => {
    for (const tipo of TIPOS_DEL_BACKEND) {
      const r = catalogoAdministrableSchema.safeParse({
        clave: 'x',
        nombre: 'X',
        descripcion: 'X',
        permiteCrear: false,
        campos: [{ nombre: 'valor', etiqueta: 'Valor', tipo, editable: true, nulo: false, maximo: null, minimo: 0 }],
      })
      expect(r.success, tipo).toBe(true)
    }
  })

  it('acepta filas con nulos, números, booleanos y fechas en texto', () => {
    expect(
      registroCatalogoSchema.safeParse({ id: '1', estado: 'A', valor: 0.45, vigenciaHasta: null, requiereTarjeta: true, vigenciaDesde: '2026-01-01' }).success,
    ).toBe(true)
  })
})
