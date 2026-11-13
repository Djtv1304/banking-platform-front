import { describe, expect, it } from 'vitest'

import { ApiError } from '@/shared/api'
import type { AgenciaDetalle } from '@/features/organizacion/api/agencias.contract'
import {
  campoDelError,
  agenciaFormSchema,
  esquemaTipoAgencia,
  existeMatriz,
  soloPermitirSucursal,
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

describe('una sola Matriz en el formulario', () => {
  const valores = { ...VALORES_NUEVA, codigo: 'SUC-QA', tipoAgencia: 'Sucursal', idCiudad: '1' }

  it('sin agencias o con solo sucursales permite elegir ambos tipos', () => {
    expect(existeMatriz([])).toBe(false)
    expect(existeMatriz([{ tipoAgencia: 'Sucursal' }])).toBe(false)
    for (const tipoAgencia of ['Matriz', 'Sucursal']) {
      expect(esquemaTipoAgencia(false).safeParse({ ...valores, tipoAgencia }).success).toBe(true)
    }
  })

  it('busca la Matriz en todo el catálogo aunque no esté activa ni en la misma ciudad', () => {
    const catalogo = [
      { tipoAgencia: 'Sucursal' as const, estado: 'A', ciudad: 'Quito' },
      { tipoAgencia: 'Matriz' as const, estado: 'C', ciudad: 'Cuenca' },
    ]
    expect(existeMatriz(catalogo)).toBe(true)
  })

  it('con Matriz rechaza otra en el formulario y permite serializar una Sucursal sin ID', () => {
    const esquema = esquemaTipoAgencia(true)
    const invalido = esquema.safeParse({ ...valores, tipoAgencia: 'Matriz' })
    expect(invalido.success).toBe(false)
    if (!invalido.success) expect(invalido.error.issues[0].path).toEqual(['tipoAgencia'])
    expect(payloadCrear(esquema.parse(valores))).toEqual({ codigo: 'SUC-QA', tipoAgencia: 'Sucursal', idCiudad: 1 })
  })

  it('la edición conserva el tipo Matriz y puede cambiar otros datos sin enviarlo', () => {
    const inicial = valoresEdicion({ ...agencia, tipoAgencia: 'Matriz' })
    const datos = agenciaFormSchema.parse({ ...inicial, telefono: '022111111' })
    expect(datos.tipoAgencia).toBe('Matriz')
    expect(payloadEdicion(inicial, datos)).toEqual({ telefono: '022111111' })
  })

  it('con Matriz restringe el alta y la edición de sucursales, pero no la propia Matriz', () => {
    const catalogo = [{ tipoAgencia: 'Matriz' as const }, { tipoAgencia: 'Sucursal' as const }]
    expect(soloPermitirSucursal(catalogo)).toBe(true)
    expect(soloPermitirSucursal(catalogo, 'Sucursal')).toBe(true)
    expect(soloPermitirSucursal(catalogo, 'Matriz')).toBe(false)
    expect(soloPermitirSucursal([{ tipoAgencia: 'Sucursal' }], 'Sucursal')).toBe(false)
  })

  it('al editar una Sucursal impide promoverla a Matriz y permite guardar sus otros datos', () => {
    const inicial = valoresEdicion(agencia)
    const esquema = esquemaTipoAgencia(soloPermitirSucursal([{ tipoAgencia: 'Matriz' }], agencia.tipoAgencia))
    expect(esquema.safeParse({ ...inicial, tipoAgencia: 'Matriz' }).success).toBe(false)
    const datos = esquema.parse({ ...inicial, direccion: 'Nueva dirección' })
    expect(payloadEdicion(inicial, datos)).toEqual({ direccion: 'Nueva dirección' })
  })

  it('al editar la propia Matriz conserva las dos opciones del formulario', () => {
    const esquema = esquemaTipoAgencia(soloPermitirSucursal([{ tipoAgencia: 'Matriz' }], 'Matriz'))
    for (const tipoAgencia of ['Matriz', 'Sucursal']) {
      expect(esquema.safeParse({ ...valores, tipoAgencia }).success).toBe(true)
    }
  })
})

describe('alta (ORG-01)', () => {
  const valores = { ...VALORES_NUEVA, codigo: ' suc-sur ', tipoAgencia: 'Sucursal', idCiudad: '1' }

  it('pasa a mayúsculas y no envía los opcionales vacíos', () => {
    const datos = agenciaFormSchema.parse(valores)
    expect(payloadCrear(datos)).toEqual({ codigo: 'SUC-SUR', tipoAgencia: 'Sucursal', idCiudad: 1 })
  })

  it('no pide ni envía ID, incluso si llegan valores heredados de un formulario anterior', () => {
    expect(VALORES_NUEVA).not.toHaveProperty('idAgencia')
    const datos = agenciaFormSchema.parse({ ...valores, idAgencia: '999' })
    expect(datos).not.toHaveProperty('idAgencia')
    expect(payloadCrear(datos)).not.toHaveProperty('idAgencia')
  })

  it('envía teléfono y dirección cuando se escriben', () => {
    const datos = agenciaFormSchema.parse({ ...valores, telefono: '(02) 234-5678', direccion: ' Av. Loja ' })
    expect(payloadCrear(datos)).toMatchObject({ telefono: '(02) 234-5678', direccion: 'Av. Loja' })
  })

  it.each([
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
    expect(inicial).toEqual({ codigo: 'SUC-NORTE', tipoAgencia: 'Sucursal', idCiudad: '17', telefono: '022345678', direccion: '' })
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
  it('un conflicto de ID automático se muestra como error general sin pedir otro ID', () => {
    const error = new ApiError('Ya existe una agencia con ese idAgencia.', 409, 'AGENCIA_YA_EXISTE')
    expect(campoDelError(error)).toBeNull()
    expect(mensajeErrorAgencia(error)).toContain('numeración')
    expect(mensajeErrorAgencia(error)).not.toContain('Usa otro')
  })
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
