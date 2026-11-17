import { describe, expect, it } from 'vitest'

import { nombreFormSchema, subcuentaFormSchema } from '@/features/contabilidad/lib/cuenta-form'

const errorDe = (resultado: { success: boolean; error?: { issues: { message: string }[] } }) => resultado.error?.issues[0]?.message

describe('subcuentaFormSchema', () => {
  const schema = subcuentaFormSchema('2101')
  const valido = { codigoCuenta: '210140', nombreCuenta: 'Depósitos de ahorro', esImputable: true }

  it('acepta un código que empieza por el del padre y es más largo', () => {
    expect(schema.safeParse(valido).success).toBe(true)
    expect(schema.parse({ ...valido, codigoCuenta: ' 21014001 ', nombreCuenta: '  Ahorro ' })).toMatchObject({
      codigoCuenta: '21014001',
      nombreCuenta: 'Ahorro',
    })
  })

  it('rechaza puntos, otro prefijo o el mismo código del padre', () => {
    expect(errorDe(schema.safeParse({ ...valido, codigoCuenta: '2101.40' }))).toMatch(/solo dígitos/)
    expect(errorDe(schema.safeParse({ ...valido, codigoCuenta: '210240' }))).toMatch(/Debe empezar por 2101/)
    expect(errorDe(schema.safeParse({ ...valido, codigoCuenta: '2101' }))).toMatch(/Agrega dígitos/)
  })

  it('el nombre es obligatorio y de 100 caracteres como máximo', () => {
    expect(errorDe(schema.safeParse({ ...valido, nombreCuenta: '   ' }))).toMatch(/Escribe el nombre/)
    expect(schema.safeParse({ ...valido, nombreCuenta: 'a'.repeat(101) }).success).toBe(false)
    expect(nombreFormSchema.safeParse({ nombreCuenta: 'a'.repeat(100) }).success).toBe(true)
  })
})
