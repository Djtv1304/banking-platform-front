import { afterEach, describe, expect, it, vi } from 'vitest'

import { normalizarCelular } from '@/features/clientes/lib/celular'
import { DATOS_CLIENTE_VACIOS, datosClienteSchema } from '@/features/clientes/schemas/registro-cliente.schema'

const cliente = {
  ...DATOS_CLIENTE_VACIOS,
  identificacion: '1710034065', nombres: 'María', apellidos: 'Pérez', fechaNacimiento: '1992-05-14',
  genero: 'F', estadoCivil: 'SOLTERO', telefonoCelular: '991234567', email: 'maria@example.test',
}

afterEach(() => vi.useRealTimers())

describe('selección de documento para persona natural', () => {
  it('conserva las letras del pasaporte y la nacionalidad predeterminada', () => {
    expect(datosClienteSchema.parse({ ...cliente, tipoDocumento: 'PASAPORTE', identificacion: 'AB1234567' })).toMatchObject({ tipoDocumento: 'PASAPORTE', identificacion: 'AB1234567', codigoPaisNacionalidad: 'ECU' })
  })
  it('no aplica el formato de pasaporte a una cédula', () => {
    expect(datosClienteSchema.safeParse({ ...cliente, tipoDocumento: 'CEDULA', identificacion: 'AB1234567' }).success).toBe(false)
  })
  it.each(['AB-12345', 'A123', 'AB 123456'])('rechaza pasaporte %j', (identificacion) => {
    expect(datosClienteSchema.safeParse({ ...cliente, tipoDocumento: 'PASAPORTE', identificacion }).success).toBe(false)
  })
})

describe('validación del celular del cliente', () => {
  it.each(['', '99123', normalizarCelular('099123456789')])('rechaza el valor inválido %j sin convertirlo en otro teléfono', (telefonoCelular) => {
    const resultado = datosClienteSchema.safeParse({ ...cliente, telefonoCelular })
    expect(resultado.success).toBe(false)
    if (!resultado.success) expect(resultado.error.issues.map((error) => error.path[0])).toContain('telefonoCelular')
  })

  it.each(['0991234567', '+593 99 123 4567', '991234567'])('acepta %s y conserva el mismo teléfono internacional', (valor) => {
    const datos = datosClienteSchema.parse({ ...cliente, telefonoCelular: normalizarCelular(valor) })
    expect(datos.telefonoCelular).toBe('+593991234567')
  })
})

describe('fecha de nacimiento del cliente', () => {
  it.each(['2023-02-29', '2024-02-30', '2000-04-31', '2000-13-01', '2000-00-10', '2000-2-9', '29/02/2000', ''])('rechaza una fecha inexistente o mal formada: %j', (fechaNacimiento) => {
    const resultado = datosClienteSchema.safeParse({ ...cliente, fechaNacimiento })
    expect(resultado.success).toBe(false)
    if (!resultado.success) expect(resultado.error.issues.map((error) => error.path[0])).toContain('fechaNacimiento')
  })

  it('acepta un 29 de febrero de un año bisiesto', () => {
    expect(datosClienteSchema.parse({ ...cliente, fechaNacimiento: '2000-02-29' }).fechaNacimiento).toBe('2000-02-29')
  })

  it.each([0, 12, 23])('compara fechas sin que la hora %i cambie los límites de edad', (hora) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 8, hora, 30))
    for (const fechaNacimiento of ['2026-11-07', '1906-11-08']) {
      expect(datosClienteSchema.safeParse({ ...cliente, fechaNacimiento }).success).toBe(true)
    }
    for (const fechaNacimiento of ['2026-11-08', '2026-11-09', '1906-11-07']) {
      expect(datosClienteSchema.safeParse({ ...cliente, fechaNacimiento }).success).toBe(false)
    }
  })
})
