import { describe, expect, it } from 'vitest'

import { ApiError } from '@/shared/api'
import {
  cupoFormSchema,
  disponible,
  disponibleCupo,
  mensajeErrorCupos,
  permisosCupos,
  textoVigencia,
  valoresCupo,
  type CupoFormInput,
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

  it('SUPERVISOR y ADMIN ven y consultan el historial; editar exige cuentas:cupos', () => {
    expect(permisosCupos(['SUPERVISOR'])).toEqual({ ver: true, editar: false, historial: true })
    expect(permisosCupos(['ADMIN'], ['cuentasCupos'])).toEqual({ ver: true, editar: true, historial: true })
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
    expect(permisosCupos([' supervisor '], ['cuentasCupos'])).toEqual({ ver: true, editar: true, historial: true })
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

describe('cupoFormSchema', () => {
  const valido: CupoFormInput = {
    cupoDiario: '400',
    cupoMensual: '5000.50',
    montoMaxTransaccion: '200,25',
    maxTransaccionesDia: '10',
    fechaVigencia: '',
  }

  const errores = (cambios: Partial<CupoFormInput>) => {
    const resultado = cupoFormSchema.safeParse({ ...valido, ...cambios })
    return resultado.success ? {} : Object.fromEntries(resultado.error.issues.map((i) => [i.path.join('.'), i.message]))
  }

  it('arma el body de CTA-08 con números, sin campos de más y null si no caduca', () => {
    expect(cupoFormSchema.parse(valido)).toEqual({
      cupoDiario: 400,
      cupoMensual: 5000.5,
      montoMaxTransaccion: 200.25,
      maxTransaccionesDia: 10,
      fechaVigencia: null,
    })
    expect(cupoFormSchema.parse({ ...valido, fechaVigencia: '2026-12-31' }).fechaVigencia).toBe('2026-12-31')
  })

  it('los montos deben ser mayores que 0 y con 2 decimales como máximo', () => {
    expect(errores({ cupoDiario: '0' })).toEqual({ cupoDiario: 'El monto debe ser mayor que 0.' })
    expect(errores({ cupoDiario: '-5' }).cupoDiario).toBe('Ingresa un monto válido, con 2 decimales como máximo.')
    // El error del campo no arrastra el de coherencia entre montos
    expect(errores({ cupoDiario: '10.123' })).toEqual({ cupoDiario: 'Ingresa un monto válido, con 2 decimales como máximo.' })
    expect(errores({ cupoDiario: '' }).cupoDiario).toBe('Ingresa un monto.')
  })

  it('el máximo de transacciones es un entero entre 1 y 32 767', () => {
    expect(errores({ maxTransaccionesDia: '0' }).maxTransaccionesDia).toBe('Ingresa un número entre 1 y 32.767.')
    expect(errores({ maxTransaccionesDia: '32768' }).maxTransaccionesDia).toBe('Ingresa un número entre 1 y 32.767.')
    expect(errores({ maxTransaccionesDia: '2.5' }).maxTransaccionesDia).toBe('Ingresa un número entero.')
    expect(errores({ maxTransaccionesDia: '32767' })).toEqual({})
  })

  it('exige máximo por transacción ≤ cupo diario ≤ cupo mensual', () => {
    expect(errores({ montoMaxTransaccion: '500' })).toEqual({ montoMaxTransaccion: 'No puede superar el cupo diario.' })
    expect(errores({ cupoMensual: '300' })).toEqual({ cupoMensual: 'Debe ser mayor o igual al cupo diario.' })
    expect(errores({ cupoDiario: '200.25', cupoMensual: '200.25' })).toEqual({})
  })

  it('rechaza una fecha de vigencia mal formada', () => {
    expect(errores({ fechaVigencia: '31/12/2026' })).toEqual({ fechaVigencia: 'Ingresa una fecha válida.' })
  })

  it('arranca con el cupo que rige hoy', () => {
    const cupo = {
      idCanal: 1,
      origen: 'Producto' as const,
      cupoDiario: 1000,
      cupoMensual: 10000,
      montoMaxTransaccion: 500.5,
      maxTransaccionesDia: 20,
      fechaVigencia: null,
      consumidoHoy: 0,
      consumidoMes: 2500,
    }
    expect(valoresCupo(cupo)).toEqual({
      cupoDiario: '1000',
      cupoMensual: '10000',
      montoMaxTransaccion: '500.5',
      maxTransaccionesDia: '20',
      fechaVigencia: '',
    })
  })
})
