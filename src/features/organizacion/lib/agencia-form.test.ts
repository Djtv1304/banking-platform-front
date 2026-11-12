import { describe, expect, it } from 'vitest'

import { ApiError } from '@/shared/api'
import type { Agencia, Ciudad } from '@/features/catalogos'
import {
  campoDelError,
  crearAgenciaFormSchema,
  editarAgenciaFormSchema,
  mensajeErrorAgencia,
  motivoFormSchema,
  payloadCrear,
  payloadEdicion,
  resolverIdCiudad,
  valoresEdicion,
  VALORES_NUEVA,
} from '@/features/organizacion/lib/agencia-form'
import { accionEstado } from '@/features/organizacion/lib/agencias'

const ciudades: Ciudad[] = [
  { idCiudad: 1, codigoPais: 'ECU', nombre: 'Cuenca', provincia: 'Azuay' },
  { idCiudad: 17, codigoPais: 'ECU', nombre: 'Quito', provincia: 'Pichincha' },
  { idCiudad: 30, codigoPais: 'ECU', nombre: 'Santo Domingo', provincia: 'Santo Domingo de los Tsáchilas' },
]

const agencia: Agencia = {
  idAgencia: '002',
  codigo: 'SUC-NORTE',
  nombre: 'Sucursal Norte',
  tipoAgencia: 'Sucursal',
  provincia: 'Pichincha',
  ciudad: 'Quito',
  estado: 'A',
}

describe('resolverIdCiudad', () => {
  it('encuentra la ciudad por nombre y provincia, sin distinguir tildes ni mayúsculas', () => {
    expect(resolverIdCiudad(agencia, ciudades)).toBe(17)
    expect(resolverIdCiudad({ ciudad: 'SANTO DOMINGO ', provincia: 'Santo Domingo de los Tsachilas' }, ciudades)).toBe(30)
  })

  it('devuelve null si no hay coincidencia o si hay más de una', () => {
    expect(resolverIdCiudad({ ciudad: 'Quito', provincia: 'Guayas' }, ciudades)).toBeNull()
    expect(resolverIdCiudad(agencia, [...ciudades, { ...ciudades[1], idCiudad: 99 }])).toBeNull()
    expect(resolverIdCiudad(agencia, [])).toBeNull()
  })
})

describe('alta (ORG-01)', () => {
  const valores = { ...VALORES_NUEVA, idAgencia: 'a01', codigo: ' suc-sur ', tipoAgencia: 'Sucursal', idCiudad: '1' }

  it('pasa a mayúsculas y no envía los opcionales vacíos', () => {
    const datos = crearAgenciaFormSchema.parse(valores)
    expect(payloadCrear(datos)).toEqual({ idAgencia: 'A01', codigo: 'SUC-SUR', tipoAgencia: 'Sucursal', idCiudad: 1 })
  })

  it('envía teléfono y dirección cuando se escriben', () => {
    const datos = crearAgenciaFormSchema.parse({ ...valores, telefono: '(02) 234-5678', direccion: ' Av. Loja ' })
    expect(payloadCrear(datos)).toMatchObject({ telefono: '(02) 234-5678', direccion: 'Av. Loja' })
  })

  it.each([
    ['idAgencia', '0001'],
    ['idAgencia', '0-1'],
    ['codigo', 'SUC_SUR'],
    ['codigo', 'ABCDEFGHIJK'],
    ['tipoAgencia', ''],
    ['idCiudad', ''],
    ['telefono', '12345'],
    ['telefono', '02-ABC-123'],
    ['direccion', 'Línea 1\nLínea 2'],
  ])('rechaza %s = %j', (campo, valor) => {
    const result = crearAgenciaFormSchema.safeParse({ ...valores, [campo]: valor })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toEqual([campo])
  })
})

describe('edición (ORG-02)', () => {
  const inicial = valoresEdicion(agencia, 17)

  it('precarga código, tipo y ciudad; teléfono y dirección vacíos', () => {
    expect(inicial).toEqual({ idAgencia: '002', codigo: 'SUC-NORTE', tipoAgencia: 'Sucursal', idCiudad: '17', telefono: '', direccion: '' })
    expect(valoresEdicion(agencia, null).idCiudad).toBe('')
  })

  it('sin cambios no hay nada que enviar', () => {
    expect(payloadEdicion(inicial, editarAgenciaFormSchema.parse(inicial))).toEqual({})
    expect(payloadEdicion(inicial, editarAgenciaFormSchema.parse({ ...inicial, codigo: 'suc-norte' }))).toEqual({})
  })

  it('envía solo los campos que cambiaron', () => {
    const datos = editarAgenciaFormSchema.parse({ ...inicial, codigo: 'SUC-N1', idCiudad: '1', telefono: '022345678' })
    expect(payloadEdicion(inicial, datos)).toEqual({ codigo: 'SUC-N1', idCiudad: 1, telefono: '022345678' })
  })

  it('con la ciudad sin resolver no la envía, salvo que se elija una', () => {
    const sinCiudad = valoresEdicion(agencia, null)
    expect(payloadEdicion(sinCiudad, editarAgenciaFormSchema.parse(sinCiudad))).toEqual({})
    expect(payloadEdicion(sinCiudad, editarAgenciaFormSchema.parse({ ...sinCiudad, idCiudad: '17' }))).toEqual({ idCiudad: 17 })
  })
})

describe('cambio de estado', () => {
  it('solo A ↔ I; una cerrada no tiene acción', () => {
    expect(accionEstado('A')).toBe('desactivar')
    expect(accionEstado('I')).toBe('activar')
    expect(accionEstado('C')).toBeNull()
  })

  it('exige un motivo de una línea y hasta 300 caracteres', () => {
    expect(motivoFormSchema.parse({ motivo: '  Cierre temporal ' })).toEqual({ motivo: 'Cierre temporal' })
    expect(motivoFormSchema.safeParse({ motivo: '   ' }).success).toBe(false)
    expect(motivoFormSchema.safeParse({ motivo: 'a'.repeat(301) }).success).toBe(false)
    expect(motivoFormSchema.safeParse({ motivo: 'uno\tdos' }).success).toBe(false)
  })
})

describe('errores del backend', () => {
  it('traduce los códigos conocidos y apunta al campo', () => {
    const error = new ApiError('Ya existe una agencia con ese código.', 409, 'CODIGO_DUPLICADO')
    expect(mensajeErrorAgencia(error)).toBe('Ya existe una agencia con ese código.')
    expect(campoDelError(error)).toBe('codigo')
    expect(campoDelError(new ApiError('x', 409, 'MATRIZ_YA_EXISTE'))).toBe('tipoAgencia')
  })

  it('muestra el mensaje del backend cuando explica el motivo', () => {
    const conActividad = new ApiError('La agencia tiene recursos u operaciones activas: cuentas.', 409, 'AGENCIA_CON_ACTIVIDAD')
    expect(mensajeErrorAgencia(conActividad)).toBe(conActividad.message)
    const matriz = new ApiError('La agencia Matriz no se puede desactivar.', 409, 'MATRIZ_NO_DESACTIVABLE')
    expect(mensajeErrorAgencia(matriz)).toBe(matriz.message)
    expect(campoDelError(matriz)).toBeNull()
  })

  it('un 403 dice que no hay permiso', () => {
    expect(mensajeErrorAgencia(new ApiError('Forbidden', 403, 'http_403'))).toBe('No tienes permiso para administrar agencias.')
  })
})
