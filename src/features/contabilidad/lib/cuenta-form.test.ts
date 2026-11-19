import { describe, expect, it } from 'vitest'

import { nombreFormSchema, siguienteCodigoLibre, subcuentaFormSchema } from '@/features/contabilidad/lib/cuenta-form'

const errorDe = (resultado: { success: boolean; error?: { issues: { message: string }[] } }) => resultado.error?.issues[0]?.message

describe('subcuentaFormSchema', () => {
  const schema = subcuentaFormSchema('210105')
  const valido = { codigoCuenta: '21010501', nombreCuenta: 'Depósitos de ahorro', esImputable: true }
  const error = (codigoCuenta: string, esquema = schema) => errorDe(esquema.safeParse({ ...valido, codigoCuenta }))
  const formato = /El código tiene 8 dígitos: el de la cuenta superior más 2 \(de 21010501 a 21010599\)\./

  it('acepta el código del padre más 2 dígitos, del 01 al 99', () => {
    expect(schema.safeParse(valido).success).toBe(true)
    expect(schema.safeParse({ ...valido, codigoCuenta: '21010599' }).success).toBe(true)
    expect(schema.parse({ ...valido, codigoCuenta: ' 21010510 ', nombreCuenta: '  Ahorro ' })).toMatchObject({
      codigoCuenta: '21010510',
      nombreCuenta: 'Ahorro',
    })
  })

  it('rechaza un dígito de más o de menos', () => {
    expect(error('2101050')).toMatch(formato)
    expect(error('210105001')).toMatch(formato)
    expect(error('2101050101')).toMatch(formato)
  })

  it('rechaza el sufijo 00', () => {
    expect(error('21010500')).toMatch(formato)
  })

  it('rechaza el mismo código del padre y otro prefijo', () => {
    expect(error('210105')).toMatch(formato)
    expect(error('21020501')).toMatch(formato)
  })

  it('rechaza letras, puntos y espacios', () => {
    expect(error('2101050A')).toMatch(/solo dígitos/)
    expect(error('210105.1')).toMatch(/solo dígitos/)
    expect(error('2101 0501')).toMatch(/solo dígitos/)
  })

  it('rechaza un código de más de 8 dígitos', () => {
    expect(error('1'.repeat(31))).toMatch(formato)
  })

  it('el código es siempre de 8 dígitos, también si el padre no es de 6', () => {
    expect(error('2101050101', subcuentaFormSchema('21010501'))).toMatch(/8 dígitos/)
    expect(error('21010501', subcuentaFormSchema('2101'))).toMatch(/8 dígitos/)
  })

  it('rechaza un código que ya existe entre las hijas', () => {
    const conHijas = subcuentaFormSchema('210105', ['21010501', '21010503'])
    expect(error('21010501', conHijas)).toBe('Ya existe la cuenta 21010501.')
    expect(conHijas.safeParse({ ...valido, codigoCuenta: '21010502' }).success).toBe(true)
  })

  it('el nombre es obligatorio y de 100 caracteres como máximo', () => {
    expect(errorDe(schema.safeParse({ ...valido, nombreCuenta: '   ' }))).toMatch(/Escribe el nombre/)
    expect(schema.safeParse({ ...valido, nombreCuenta: 'a'.repeat(101) }).success).toBe(false)
    expect(nombreFormSchema.safeParse({ nombreCuenta: 'a'.repeat(100) }).success).toBe(true)
  })
})

describe('siguienteCodigoLibre', () => {
  it('sin hijas sugiere el 01', () => {
    expect(siguienteCodigoLibre('110105', [])).toBe('11010501')
  })

  it('toma el menor hueco, no el siguiente al mayor', () => {
    expect(siguienteCodigoLibre('110105', ['11010501', '11010502', '11010504'])).toBe('11010503')
    expect(siguienteCodigoLibre('110105', ['11010502', '11010503'])).toBe('11010501')
  })

  it('ignora códigos de otros padres', () => {
    expect(siguienteCodigoLibre('110105', ['11010601', '11010501'])).toBe('11010502')
  })

  it('devuelve null con los 99 ocupados', () => {
    const lleno = Array.from({ length: 99 }, (_, i) => `110105${String(i + 1).padStart(2, '0')}`)
    expect(siguienteCodigoLibre('110105', lleno)).toBeNull()
    expect(siguienteCodigoLibre('110105', lleno.slice(1))).toBe('11010501')
  })

  it('el código propuesto es de 8 dígitos', () => {
    expect(siguienteCodigoLibre('210140', [])).toHaveLength(8)
  })

  it('devuelve null si el padre no es de 6 dígitos', () => {
    expect(siguienteCodigoLibre('2101', [])).toBeNull()
    expect(siguienteCodigoLibre('21014001', [])).toBeNull()
  })
})
