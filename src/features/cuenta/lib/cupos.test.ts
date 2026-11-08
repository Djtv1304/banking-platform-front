import { describe, expect, it } from 'vitest'

import { ApiError } from '@/shared/api'
import {
  disponible,
  disponibleCupo,
  mensajeErrorCupos,
  permisosCupos,
  textoVigencia,
} from '@/features/cuenta/lib/cupos'

describe('disponible', () => {
  it('resta lo consumido del cupo', () => {
    expect(disponible(400, 100)).toBe(300)
    expect(disponible(1000, 0)).toBe(1000)
  })

  it('redondea a centavos sin arrastrar errores de coma flotante', () => {
    expect(disponible(0.3, 0.1)).toBe(0.2)
    expect(disponible(400, 100.1)).toBe(299.9)
  })

  it('nunca es negativo: si el consumo supera el cupo queda en 0', () => {
    expect(disponible(100, 100)).toBe(0)
    expect(disponible(100, 150.75)).toBe(0)
  })

  it('calcula el disponible diario y el mensual de un cupo', () => {
    const cupo = { cupoDiario: 400, cupoMensual: 5000, consumidoHoy: 100, consumidoMes: 1200 }
    expect(disponibleCupo(cupo)).toEqual({ diario: 300, mensual: 3800 })
  })
})

describe('permisosCupos', () => {
  it('ASESOR solo ve los cupos', () => {
    expect(permisosCupos(['ASESOR'])).toEqual({ ver: true, editar: false, historial: false })
  })

  it('SUPERVISOR y ADMIN ven, editan y consultan el historial', () => {
    expect(permisosCupos(['SUPERVISOR'])).toEqual({ ver: true, editar: true, historial: true })
    expect(permisosCupos(['ADMIN'])).toEqual({ ver: true, editar: true, historial: true })
  })

  it('AUDITOR solo consulta el historial', () => {
    expect(permisosCupos(['AUDITOR'])).toEqual({ ver: false, editar: false, historial: true })
  })

  it('otros roles o sin roles no tienen acciones', () => {
    expect(permisosCupos(['CAJERO'])).toEqual({ ver: false, editar: false, historial: false })
    expect(permisosCupos([])).toEqual({ ver: false, editar: false, historial: false })
  })

  it('suma los permisos de varios roles y tolera minúsculas y espacios', () => {
    expect(permisosCupos(['ASESOR', 'AUDITOR'])).toEqual({ ver: true, editar: false, historial: true })
    expect(permisosCupos([' supervisor '])).toEqual({ ver: true, editar: true, historial: true })
  })
})

describe('textoVigencia', () => {
  it('null es un cupo sin caducidad', () => {
    expect(textoVigencia(null)).toBe('Sin caducidad')
  })

  it('muestra el último día sin correrlo por la zona horaria', () => {
    expect(textoVigencia('2026-12-31')).toBe('Hasta el 31 de diciembre de 2026')
    expect(textoVigencia('2027-01-01')).toBe('Hasta el 1 de enero de 2027')
  })
})

describe('mensajeErrorCupos', () => {
  it('403 dice qué acción no está permitida', () => {
    const error = new ApiError('Forbidden', 403, 'PERMISO_DENEGADO')
    expect(mensajeErrorCupos(error, 'ver')).toBe('No tienes permiso para ver los cupos de esta cuenta.')
    expect(mensajeErrorCupos(error, 'editar')).toBe('No tienes permiso para modificar los cupos de esta cuenta.')
    expect(mensajeErrorCupos(error, 'historial')).toBe('No tienes permiso para ver el historial de cupos.')
  })

  it('traduce los códigos de negocio de CTA-07/08/09', () => {
    expect(mensajeErrorCupos(new ApiError('x', 404, 'CUENTA_NO_ENCONTRADA'), 'ver')).toBe(
      'No existe una cuenta con ese ID.',
    )
    expect(mensajeErrorCupos(new ApiError('x', 422, 'CUPO_SUPERA_MAXIMO_PRODUCTO'), 'editar')).toBe(
      'Un monto o el máximo de transacciones supera el cupo del producto en este canal.',
    )
  })

  it('un código desconocido muestra el mensaje del backend', () => {
    const error = new ApiError('No se pudo comprobar el cupo efectivo del canal.', 503, 'CUPO_EFECTIVO_NO_VERIFICABLE')
    expect(mensajeErrorCupos(error, 'editar')).toBe('No se pudo comprobar el cupo efectivo del canal.')
  })
})
