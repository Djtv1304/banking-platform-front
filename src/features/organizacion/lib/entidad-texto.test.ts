import { describe, expect, it } from 'vitest'

import { ApiError } from '@/shared/api'
import {
  entidadNoRegistrada,
  etiquetaEstadoEntidad,
  mensajeErrorEntidad,
  puedeEditarEntidad,
  textoFechaConstitucion,
  textoFechaRegistro,
  textoOpcional,
} from '@/features/organizacion/lib/entidad-texto'

describe('textoOpcional', () => {
  it('muestra «—» para null y para texto vacío', () => {
    expect(textoOpcional(null)).toBe('—')
    expect(textoOpcional('  ')).toBe('—')
  })

  it('muestra el valor cuando existe', () => {
    expect(textoOpcional('022345678')).toBe('022345678')
    expect(textoOpcional(3)).toBe('3')
  })
})

describe('etiquetaEstadoEntidad', () => {
  it('traduce A e I', () => {
    expect(etiquetaEstadoEntidad('A')).toBe('Activa')
    expect(etiquetaEstadoEntidad('I')).toBe('Inactiva')
  })
})

describe('fechas', () => {
  it('la fecha de constitución es un día, sin corrimiento por zona horaria', () => {
    expect(textoFechaConstitucion('2010-05-20')).toContain('20')
    expect(textoFechaConstitucion('2010-05-20')).toContain('2010')
  })

  it('si no es una fecha válida devuelve el texto original', () => {
    expect(textoFechaConstitucion('no-es-fecha')).toBe('no-es-fecha')
    expect(textoFechaRegistro('no-es-fecha')).toBe('no-es-fecha')
  })

  it('la fecha de registro incluye el año', () => {
    expect(textoFechaRegistro('2026-11-01T10:30:00')).toContain('2026')
  })
})

describe('puedeEditarEntidad', () => {
  it('solo el ADMIN edita, sin importar mayúsculas ni espacios', () => {
    expect(puedeEditarEntidad(['ADMIN'])).toBe(true)
    expect(puedeEditarEntidad([' admin '])).toBe(true)
    expect(puedeEditarEntidad(['ASESOR', 'SUPERVISOR'])).toBe(false)
    expect(puedeEditarEntidad([])).toBe(false)
  })
})

describe('mensajeErrorEntidad', () => {
  it('un 403 habla de permisos según la acción', () => {
    const error = new ApiError('Forbidden', 403, 'http_403')
    expect(mensajeErrorEntidad(error, 'ver')).toBe('No tienes permiso para ver los datos de la entidad.')
    expect(mensajeErrorEntidad(error, 'editar')).toBe('No tienes permiso para modificar los datos de la entidad.')
  })

  it('traduce los códigos conocidos y deja pasar el mensaje de los demás', () => {
    expect(mensajeErrorEntidad(new ApiError('x', 400, 'DATOS_INVALIDOS'), 'editar')).toContain('Revisa los datos')
    expect(mensajeErrorEntidad(new ApiError('Algo falló', 500, 'ERROR_INTERNO'), 'ver')).toBe('Algo falló')
  })
})

describe('entidadNoRegistrada', () => {
  it('reconoce el 404 ENTIDAD_NO_ENCONTRADA', () => {
    expect(entidadNoRegistrada(new ApiError('x', 404, 'ENTIDAD_NO_ENCONTRADA'))).toBe(true)
    expect(entidadNoRegistrada(new ApiError('x', 500, 'ERROR_INTERNO'))).toBe(false)
  })
})
