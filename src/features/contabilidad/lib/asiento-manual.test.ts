import { describe, expect, it } from 'vitest'

import { CONCEPTO_ASIENTO_MAXIMO } from '@/features/contabilidad/api/asientos.contract'
import {
  cuerpoAsiento,
  detalleErroresAsiento,
  errorAgencia,
  errorConcepto,
  esBorrador,
  MENSAJE_ASIENTO_MANUAL_NO_DISPONIBLE,
  mensajeErrorAsientoManual,
} from '@/features/contabilidad/lib/asiento-manual'
import { ApiError } from '@/shared/api'

describe('concepto y agencia', () => {
  it.each([
    ['', 'Escribe el concepto del asiento.'],
    ['   ', 'Escribe el concepto del asiento.'],
    ['abc', 'El concepto debe tener al menos 5 caracteres.'],
    ['x'.repeat(CONCEPTO_ASIENTO_MAXIMO + 1), `El concepto admite hasta ${CONCEPTO_ASIENTO_MAXIMO} caracteres.`],
  ])('«%s» no es un concepto válido', (concepto, mensaje) => {
    expect(errorConcepto(concepto)).toBe(mensaje)
  })

  it('acepta un concepto normal y uno del largo máximo', () => {
    expect(errorConcepto('Provisión de intereses de noviembre')).toBeUndefined()
    expect(errorConcepto('x'.repeat(CONCEPTO_ASIENTO_MAXIMO))).toBeUndefined()
  })

  it('pide la agencia', () => {
    expect(errorAgencia('')).toBe('Elige la agencia del asiento.')
    expect(errorAgencia('001')).toBeUndefined()
  })

  it('el cuerpo recorta y colapsa los espacios del concepto', () => {
    expect(cuerpoAsiento('  Ajuste   por  redondeo ', '001', [])).toEqual({ concepto: 'Ajuste por redondeo', idAgencia: '001', lineas: [] })
  })

  it('sólo BORRADOR es editable, sin importar mayúsculas', () => {
    expect(esBorrador(' borrador ')).toBe(true)
    expect(esBorrador('PENDIENTE_APROBACION')).toBe(false)
  })
})

describe('errores del backend', () => {
  it('un endpoint sin desplegar avisa que el borrador no se guardó', () => {
    expect(mensajeErrorAsientoManual(new ApiError('x', 404, 'http_404'))).toBe(MENSAJE_ASIENTO_MANUAL_NO_DISPONIBLE)
    expect(mensajeErrorAsientoManual(new ApiError('x', 501, 'cualquiera'))).toBe(MENSAJE_ASIENTO_MANUAL_NO_DISPONIBLE)
  })

  it.each(['ASIENTO_NO_CUADRA', 'CUENTA_SOLO_AUTOMATICA', 'CUENTA_CONTABLE_NO_HABILITADA', 'ASIENTO_DE_OPERACION', 'AUTOAPROBACION_NO_PERMITIDA'])(
    '%s tiene un mensaje propio',
    code => {
      const mensaje = mensajeErrorAsientoManual(new ApiError('genérico', 409, code))
      expect(mensaje).not.toBe('genérico')
    },
  )

  it('un 403 sin código explica qué no puede hacer el rol', () => {
    expect(mensajeErrorAsientoManual(new ApiError('x', 403, 'forbidden'))).toBe('Tu rol no puede registrar asientos manuales.')
    expect(mensajeErrorAsientoManual(new ApiError('x', 403, 'forbidden'), 'reversar')).toBe('Tu rol no puede solicitar reversos de asientos.')
  })

  it('cualquier otro error conserva el mensaje normalizado', () => {
    expect(mensajeErrorAsientoManual(new ApiError('Servidor caído', 500, 'http_500'))).toBe('Servidor caído')
  })

  it('los errores por campo de líneas se numeran como en la grilla', () => {
    const error = new ApiError('x', 422, 'validacion', [
      { field: 'lineas[0].monto', message: 'Debe ser mayor que cero' },
      { field: 'concepto', message: 'Demasiado largo' },
      { field: 'idAgencia', message: 'No existe' },
    ])
    expect(detalleErroresAsiento(error)).toEqual(['Línea 1: Debe ser mayor que cero', 'Concepto: Demasiado largo', 'No existe'])
  })
})
