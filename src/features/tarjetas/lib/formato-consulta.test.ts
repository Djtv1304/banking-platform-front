import { describe, expect, it } from 'vitest'

import { ApiError } from '@/shared/api'
import {
  etiquetaTipo,
  formatearDia,
  mensajeErrorTarjetas,
  tonoEstado,
} from '@/features/tarjetas/lib/formato-consulta'

describe('formatearDia', () => {
  it('muestra el día sin correrlo por la zona horaria', () => {
    expect(formatearDia('2026-11-09')).toBe('9 de noviembre de 2026')
    expect(formatearDia('2031-01-01')).toBe('1 de enero de 2031')
  })

  it('de una fecha con hora toma el día', () => {
    expect(formatearDia('2026-11-09T23:30:00')).toBe('9 de noviembre de 2026')
  })

  it('sin fecha muestra una raya y con un valor raro lo deja tal cual', () => {
    expect(formatearDia(null)).toBe('—')
    expect(formatearDia(undefined)).toBe('—')
    expect(formatearDia('mañana')).toBe('mañana')
  })
})

describe('etiquetaTipo', () => {
  it('pone las tildes', () => {
    expect(etiquetaTipo('Debito')).toBe('Débito')
    expect(etiquetaTipo('Credito')).toBe('Crédito')
  })
})

describe('tonoEstado', () => {
  it('agrupa los estados de develop', () => {
    expect(tonoEstado('Solicitada')).toBe('pendiente')
    expect(tonoEstado('Activa')).toBe('activa')
    expect(tonoEstado('Bloqueada')).toBe('bloqueada')
    expect(tonoEstado('Vencida')).toBe('terminal')
  })

  it('un estado desconocido no rompe: tono neutro', () => {
    expect(tonoEstado('Suspendida')).toBe('desconocido')
    expect(tonoEstado('')).toBe('desconocido')
  })
})

describe('mensajeErrorTarjetas', () => {
  it('403 es falta de permiso, sea cual sea el código', () => {
    expect(mensajeErrorTarjetas(new ApiError('Forbidden', 403, 'http_403'))).toBe(
      'No tienes permiso para consultar tarjetas.',
    )
  })

  it('traduce los códigos conocidos', () => {
    expect(mensajeErrorTarjetas(new ApiError('x', 400, 'DATOS_INVALIDOS'))).toBe(
      'Revisa los filtros: hay valores que no son válidos.',
    )
  })

  it('con otro código muestra el mensaje del backend', () => {
    expect(mensajeErrorTarjetas(new ApiError('Servicio caído', 503, 'http_503'))).toBe('Servicio caído')
  })
})
