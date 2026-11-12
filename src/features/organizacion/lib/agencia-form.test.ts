import { describe, expect, it } from 'vitest'

import { ApiError } from '@/shared/api'
import type { AgenciaDetalle } from '@/features/organizacion/api/agencias.contract'
import {
  campoDelError,
  agenciaFormSchema,
  mensajeErrorAgencia,
  motivoFormSchema,
  payloadCrear,
  payloadEdicion,
  valoresEdicion,
  VALORES_NUEVA,
} from '@/features/organizacion/lib/agencia-form'
import { accionEstado } from '@/features/organizacion/lib/agencias'

const agencia: AgenciaDetalle = {
  idAgencia: '002',
  codigo: 'SUC-NORTE',
  tipoAgencia: 'Sucursal',
  estado: 'A',
  idCiudad: 17,
  telefono: '022345678',
  direccion: null,
  fechaCreacion: '2026-11-01T10:00:00-05:00',
  vinculadaWorkos: false,
}

describe('alta (ORG-01)', () => {
  const valores = { ...VALORES_NUEVA, idAgencia: 'a01', codigo: ' suc-sur ', tipoAgencia: 'Sucursal', idCiudad: '1' }

  it('pasa a mayúsculas y no envía los opcionales vacíos', () => {
    const datos = agenciaFormSchema.parse(valores)
    expect(payloadCrear(datos)).toEqual({ idAgencia: 'A01', codigo: 'SUC-SUR', tipoAgencia: 'Sucursal', idCiudad: 1 })
  })

  it('envía teléfono y dirección cuando se escriben', () => {
    const datos = agenciaFormSchema.parse({ ...valores, telefono: '(02) 234-5678', direccion: ' Av. Loja ' })
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
    const result = agenciaFormSchema.safeParse({ ...valores, [campo]: valor })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toEqual([campo])
  })
})

describe('edición (ORG-02)', () => {
  const inicial = valoresEdicion(agencia)

  it('precarga lo que devuelve el detalle; un opcional null queda vacío', () => {
    expect(inicial).toEqual({ idAgencia: '002', codigo: 'SUC-NORTE', tipoAgencia: 'Sucursal', idCiudad: '17', telefono: '022345678', direccion: '' })
  })

  it('sin cambios no hay nada que enviar', () => {
    expect(payloadEdicion(inicial, agenciaFormSchema.parse(inicial))).toEqual({})
    expect(payloadEdicion(inicial, agenciaFormSchema.parse({ ...inicial, codigo: 'suc-norte', telefono: ' 022345678 ' }))).toEqual({})
  })

  it('envía solo los campos que cambiaron', () => {
    const datos = agenciaFormSchema.parse({ ...inicial, codigo: 'SUC-N1', idCiudad: '1', direccion: 'Av. Amazonas N24-03' })
    expect(payloadEdicion(inicial, datos)).toEqual({ codigo: 'SUC-N1', idCiudad: 1, direccion: 'Av. Amazonas N24-03' })
  })

  it('un opcional vaciado se envía como null para borrarlo', () => {
    expect(payloadEdicion(inicial, agenciaFormSchema.parse({ ...inicial, telefono: '  ' }))).toEqual({ telefono: null })
  })

  it('la ciudad es obligatoria', () => {
    expect(agenciaFormSchema.safeParse({ ...inicial, idCiudad: '' }).success).toBe(false)
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
