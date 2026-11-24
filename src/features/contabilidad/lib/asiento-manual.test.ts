import { describe, expect, it } from 'vitest'

import { CONCEPTO_ASIENTO_MAXIMO } from '@/features/contabilidad/api/asientos.contract'
import {
  accionesDeAsiento,
  cuerpoAsiento,
  detalleErroresAsiento,
  errorAgencia,
  errorConcepto,
  esAsientoDeOperacion,
  esBorrador,
  MENSAJE_ASIENTO_DE_OPERACION,
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

  it.each(['ASIENTO_NO_CUADRA', 'CUENTA_SOLO_AUTOMATICA', 'CUENTA_CONTABLE_NO_HABILITADA', 'ASIENTO_DE_OPERACION', 'AUTOAPROBACION_NO_PERMITIDA', 'MOTIVO_INVALIDO'])(
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

describe('accionesDeAsiento', () => {
  const todo = { puedeCrear: true, puedeReversar: true }
  const nada = { puedeCrear: false, puedeReversar: false }
  const asiento = (estado: string, origen = 'MANUAL', idAsientoReversion: number | null = null) => ({ estado, origen, idAsientoReversion })

  it('un borrador con permiso se edita, se envía y se anula, pero no se reversa', () => {
    expect(accionesDeAsiento(asiento('BORRADOR'), todo)).toEqual({ editar: true, enviar: true, anular: true, reversar: false })
  })

  it('un borrador que dejó otro módulo no se edita, ni se envía ni se anula desde aquí', () => {
    expect(accionesDeAsiento(asiento('BORRADOR', 'CAJA'), todo)).toEqual({ editar: false, enviar: false, anular: false, reversar: false })
    expect(accionesDeAsiento(asiento(' borrador ', ' manual '), todo)).toMatchObject({ editar: true, enviar: true, anular: true })
  })

  it('el borrador exige puedeCrear; el reverso no lo reemplaza', () => {
    expect(accionesDeAsiento(asiento('BORRADOR'), { puedeCrear: false, puedeReversar: true })).toEqual({
      editar: false,
      enviar: false,
      anular: false,
      reversar: false,
    })
  })

  it('un manual contabilizado se reversa sólo con permiso, sin comparar mayúsculas ni espacios', () => {
    expect(accionesDeAsiento(asiento(' contabilizado ', ' manual '), todo).reversar).toBe(true)
    expect(accionesDeAsiento(asiento('CONTABILIZADO'), { puedeCrear: true, puedeReversar: false }).reversar).toBe(false)
    expect(accionesDeAsiento(asiento('CONTABILIZADO'), todo)).toMatchObject({ editar: false, enviar: false, anular: false })
  })

  it('un asiento de operación contabilizado no se reversa desde aquí', () => {
    expect(accionesDeAsiento(asiento('CONTABILIZADO', 'CAJA'), todo).reversar).toBe(false)
  })

  it('un reverso no se vuelve a reversar', () => {
    expect(accionesDeAsiento(asiento('CONTABILIZADO', 'MANUAL', 12), todo).reversar).toBe(false)
  })

  it.each(['REVERSADO', 'ANULADO', 'PENDIENTE'])('en estado %s no hay acciones', (estado) => {
    expect(accionesDeAsiento(asiento(estado), todo)).toEqual({ editar: false, enviar: false, anular: false, reversar: false })
  })

  it('sin permisos no hay acciones', () => {
    expect(accionesDeAsiento(asiento('BORRADOR'), nada)).toEqual({ editar: false, enviar: false, anular: false, reversar: false })
    expect(accionesDeAsiento(asiento('CONTABILIZADO'), nada).reversar).toBe(false)
  })
})

describe('esAsientoDeOperacion', () => {
  it('sólo un contabilizado de origen distinto de MANUAL', () => {
    expect(esAsientoDeOperacion({ estado: 'CONTABILIZADO', origen: 'CAJA' })).toBe(true)
    expect(esAsientoDeOperacion({ estado: 'CONTABILIZADO', origen: 'manual ' })).toBe(false)
    expect(esAsientoDeOperacion({ estado: 'BORRADOR', origen: 'CAJA' })).toBe(false)
    expect(MENSAJE_ASIENTO_DE_OPERACION).toContain('operación')
  })
})
