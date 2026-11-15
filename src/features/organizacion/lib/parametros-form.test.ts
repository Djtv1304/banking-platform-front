import { describe, expect, it } from 'vitest'

import { alternar, parametrosFormSchema, valoresParametros } from '@/features/organizacion/lib/parametros-form'

const base = {
  montoMinimo: '500',
  montoMaximo: '10000',
  plazoMinimoMeses: '6',
  plazoMaximoMeses: '48',
  tasasInteres: [1],
  sistemasAmortizacion: ['FRANCES'],
}

describe('parámetros del subproducto', () => {
  it('convierte los textos en números y los vacíos en null (sin límite)', () => {
    expect(parametrosFormSchema.parse(base)).toEqual({
      ...base,
      montoMinimo: 500,
      montoMaximo: 10000,
      plazoMinimoMeses: 6,
      plazoMaximoMeses: 48,
    })
    expect(parametrosFormSchema.parse({ ...base, montoMinimo: '', plazoMaximoMeses: ' ' })).toMatchObject({
      montoMinimo: null,
      plazoMaximoMeses: null,
    })
  })

  it('rechaza rangos invertidos, ceros y formatos inválidos', () => {
    expect(parametrosFormSchema.safeParse({ ...base, montoMinimo: '20000' }).success).toBe(false)
    expect(parametrosFormSchema.safeParse({ ...base, plazoMinimoMeses: '60' }).success).toBe(false)
    expect(parametrosFormSchema.safeParse({ ...base, montoMaximo: '0' }).success).toBe(false)
    expect(parametrosFormSchema.safeParse({ ...base, montoMaximo: '10,000' }).success).toBe(false)
    expect(parametrosFormSchema.safeParse({ ...base, plazoMaximoMeses: '601' }).success).toBe(false)
  })

  it('arma los valores iniciales desde la respuesta del backend', () => {
    expect(
      valoresParametros({ idSubProducto: 3, montoMaximo: 10000, tasasInteres: [], sistemasAmortizacion: [] }),
    ).toMatchObject({ montoMinimo: '', montoMaximo: '10000' })
  })

  it('el checklist no repite elementos', () => {
    expect(alternar([1, 2], 2, true)).toEqual([1, 2])
    expect(alternar([1, 2], 1, false)).toEqual([2])
  })
})
