import { describe, expect, it } from 'vitest'

import { ApiError } from '@/shared/api'
import {
  diasSiguientes,
  esFechaFueraDelCalendario,
  etiquetaEstadoDia,
  formatearFechaCorta,
  formatearFechaLarga,
  formatearHoraCorte,
  MENSAJE_FECHA_SIN_CALENDARIO,
  mensajeErrorFechaContable,
  sumarDias,
  textoCorte,
  tipoDia,
} from '@/features/contabilidad/lib/fecha-contable'

describe('sumarDias / diasSiguientes', () => {
  it('suma días dentro del mes', () => {
    expect(sumarDias('2026-11-17', 1)).toBe('2026-11-18')
  })

  it('cruza el fin de mes y de año', () => {
    expect(sumarDias('2026-11-30', 1)).toBe('2026-12-01')
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('respeta el 29 de febrero de un año bisiesto', () => {
    expect(sumarDias('2028-02-28', 1)).toBe('2028-02-29')
    expect(sumarDias('2028-02-28', 2)).toBe('2028-03-01')
    expect(sumarDias('2027-02-28', 1)).toBe('2027-03-01')
  })

  it('devuelve null si la fecha no existe', () => {
    expect(sumarDias('2026-02-30', 1)).toBeNull()
    expect(sumarDias('17/11/2026', 1)).toBeNull()
  })

  it('da los 7 días que siguen, sin incluir la fecha de partida', () => {
    expect(diasSiguientes('2026-11-17')).toEqual([
      '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24',
    ])
  })

  it('cruza el cambio de año en la tira de 7 días', () => {
    expect(diasSiguientes('2026-12-28')).toEqual([
      '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03', '2027-01-04',
    ])
  })

  it('no devuelve nada si la fecha de partida es inválida', () => {
    expect(diasSiguientes('no-es-fecha')).toEqual([])
  })
})

describe('formato de fechas (sin corrimientos por zona)', () => {
  it('fecha larga en es-EC', () => {
    expect(formatearFechaLarga('2026-11-17')).toBe('martes, 17 de noviembre de 2026')
  })

  it('primer y último día del año no se corren al mes vecino', () => {
    expect(formatearFechaLarga('2027-01-01')).toBe('viernes, 1 de enero de 2027')
    expect(formatearFechaLarga('2026-12-31')).toBe('jueves, 31 de diciembre de 2026')
  })

  it('fecha corta', () => {
    expect(formatearFechaCorta('2026-11-20')).toBe('vie, 20 nov')
  })

  it('un texto que no es fecha se muestra tal cual', () => {
    expect(formatearFechaLarga('xx')).toBe('xx')
    expect(formatearFechaCorta('xx')).toBe('xx')
  })

  it('hora de corte en HH:mm y texto con la hora real', () => {
    expect(formatearHoraCorte('19:00:00')).toBe('19:00')
    expect(formatearHoraCorte('18:30')).toBe('18:30')
    expect(textoCorte('19:00:00')).toBe('Lo que se registre después de las 19:00 se fecha el siguiente día hábil.')
    expect(textoCorte('18:30:00')).toContain('las 18:30')
  })
})

describe('tipoDia y estado', () => {
  const base = { esDiaContable: false, esFeriado: false, esFinDeSemana: false }

  it('día contable = hábil', () => {
    expect(tipoDia({ ...base, esDiaContable: true })).toBe('habil')
    expect(etiquetaEstadoDia({ esDiaContable: true })).toBe('Día contable')
  })

  it('feriado gana sobre fin de semana', () => {
    expect(tipoDia({ ...base, esFeriado: true })).toBe('feriado')
    expect(tipoDia({ ...base, esFeriado: true, esFinDeSemana: true })).toBe('feriado')
  })

  it('fin de semana y no contable sin motivo', () => {
    expect(tipoDia({ ...base, esFinDeSemana: true })).toBe('fin-de-semana')
    expect(tipoDia(base)).toBe('no-contable')
    expect(etiquetaEstadoDia(base)).toBe('No contable')
  })
})

describe('errores', () => {
  const noEncontrada = new ApiError('No existe', 404, 'FECHA_NO_ENCONTRADA')

  it('un 404 con code propio es «fuera del calendario»; uno genérico no', () => {
    expect(esFechaFueraDelCalendario(noEncontrada)).toBe(true)
    expect(esFechaFueraDelCalendario(new ApiError('x', 404, 'CALENDARIO_SIN_FECHA'))).toBe(true)
    expect(esFechaFueraDelCalendario(new ApiError('x', 404, 'HTTP_404'))).toBe(false)
    expect(esFechaFueraDelCalendario(new ApiError('x', 500, 'FECHA_NO_ENCONTRADA'))).toBe(false)
  })

  it('mensajes por tipo de error', () => {
    expect(mensajeErrorFechaContable(noEncontrada)).toBe(MENSAJE_FECHA_SIN_CALENDARIO)
    expect(mensajeErrorFechaContable(new ApiError('x', 400, 'FECHA_INVALIDA'))).toMatch(/no es válida/)
    expect(mensajeErrorFechaContable(new ApiError('x', 403, 'http_403'))).toMatch(/Tu rol/)
    expect(mensajeErrorFechaContable(new ApiError('Falló', 500, 'ERROR'))).toBe('Falló')
  })
})
