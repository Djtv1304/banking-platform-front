import { describe, expect, it } from 'vitest'
import { entradaSchema, pendienteSchema, registradoSchema } from '@/features/parametros/api/parametros.contract'
import { validarValor } from '@/features/parametros/lib/validacion'

describe('contratos y validaciones de parametros', () => {
  it('202 exige una solicitud real, no un valor registrado', () => {
    expect(pendienteSchema.safeParse({ idParametroValor: 1, estado: 'Registrado' }).success).toBe(false)
    expect(registradoSchema.safeParse({ idSolicitud: 1, estado: 'Pendiente' }).success).toBe(false)
  })
  it('rechaza actor y fechas imposibles en el formulario', () => {
    expect(entradaSchema.safeParse({ valor: '1', vigenciaDesde: '2026-02-30', idAgencia: null }).success).toBe(false)
    expect(entradaSchema.safeParse({ valor: '1', vigenciaDesde: '2026-11-17', idAgencia: null, creadoPor: 5 }).success).toBe(false)
  })
  it.each([['1.1', 'Entero'], ['NaN', 'Decimal'], ['1.00001', 'Decimal'], ['24:00', 'Hora'], ['True', 'Booleano'], ['[1]', 'Lista']])('rechaza %s como %s', (valor, tipo) => {
    const tipoDato = tipo as 'Entero' | 'Decimal' | 'Hora' | 'Booleano' | 'Lista'
    expect(validarValor({ tipoDato, minimo: null, maximo: null }, { valor, vigenciaDesde: '2026-11-17', idAgencia: null }, '2026-11-17')).not.toBeNull()
  })
  it('respeta limites decimales inclusivos y fechas', () => {
    const p = { tipoDato: 'Decimal' as const, minimo: '0.1000', maximo: '0.3000' }
    expect(validarValor(p, { valor: '0.3', vigenciaDesde: '2026-11-17', idAgencia: null }, '2026-11-17')).toBeNull()
    expect(validarValor(p, { valor: '0.3001', vigenciaDesde: '2026-11-17', idAgencia: null }, '2026-11-17')).not.toBeNull()
    expect(validarValor(p, { valor: '0.2', vigenciaDesde: '2026-11-16', idAgencia: null }, '2026-11-17')).not.toBeNull()
  })
})
