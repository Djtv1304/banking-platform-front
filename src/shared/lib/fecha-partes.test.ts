import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { completarDia, fechaDesdePartes, partesDeFecha } from '@/shared/lib/fecha-partes'

describe('Fecha día/mes/año sin dependencias de locale o zona horaria', () => {
  it('mantiene el orden día/mes y envía ISO sin interpretar como formato estadounidense', () => {
    expect(fechaDesdePartes({ dia: '05', mes: '11', anio: '2000' })).toBe('2000-11-05')
    expect(partesDeFecha('2000-11-05')).toEqual({ dia: '05', mes: '11', anio: '2000' })
  })
  it('permite ingresar el año directamente y reconoce años bisiestos', () => {
    expect(fechaDesdePartes({ dia: '29', mes: '02', anio: '2000' })).toBe('2000-02-29')
    expect(fechaDesdePartes({ dia: '29', mes: '02', anio: '2024' })).toBe('2024-02-29')
  })
  it.each([
    { dia: '31', mes: '04', anio: '2000' },
    { dia: '29', mes: '02', anio: '1900' },
    { dia: '00', mes: '01', anio: '2000' },
    { dia: '15', mes: '13', anio: '2000' },
    { dia: '15', mes: '01', anio: '0000' },
    { dia: '15', mes: '01', anio: '26' },
    { dia: '', mes: '01', anio: '2000' },
  ])('conserva borrador inválido sin convertirlo en una fecha guardable: %j', partes => {
    const valor = fechaDesdePartes(partes)
    expect(z.iso.date().safeParse(valor).success).toBe(false)
    expect(partesDeFecha(valor)).toEqual(partes)
  })
  it('añade cero al día solo al salir, no mientras se escribe otro día de dos dígitos', () => {
    const partes = { dia: '2', mes: '01', anio: '2000' }
    expect(partesDeFecha(fechaDesdePartes(partes)).dia).toBe('2')
    expect(fechaDesdePartes(completarDia(partes))).toBe('2000-01-02')
    expect(fechaDesdePartes({ ...partes, dia: '25' })).toBe('2000-01-25')
  })
  it('vaciar o resetear no introduce una fecha actual ni datos anteriores', () => {
    expect(fechaDesdePartes({ dia: '', mes: '', anio: '' })).toBe('')
    expect(partesDeFecha('')).toEqual({ dia: '', mes: '', anio: '' })
  })
  it('no pierde mes y año al escribir un separador inválido en el día', () => {
    const partes = { dia: '/', mes: '01', anio: '2000' }
    expect(partesDeFecha(fechaDesdePartes(partes))).toEqual(partes)
  })
})
