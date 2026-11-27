import { describe, expect, it } from 'vitest'

import { ApiError } from '@/shared/api'
import { mensajeErrorCaja, operacionSinConfirmar } from '@/features/caja/api/caja.api'
import { abrirJornadaSchema, jornadaSchema, paginaMovimientosCajaSchema } from '@/features/caja/api/caja.contract'
import { etiquetaTipoMovimiento, montoConSigno, nombreVentanilla, totalDotado } from '@/features/caja/lib/formato'

describe('contrato de caja', () => {
  it('lee la jornada del backend con la hora de Ecuador y sin cierre', () => {
    const jornada = jornadaSchema.parse({
      idJornadaCaja: 7,
      idUsuario: 3,
      idCajaFisica: 2,
      idAgencia: '001',
      fechaHoraApertura: '2026-11-26T08:01:00-05:00',
      fechaHoraCierre: null,
      dineroInicial: 0,
      estado: 'ABIERTA',
      observacion: null,
    })
    expect(jornada.estado).toBe('ABIERTA')
  })

  it('lee movimientos con campos opcionales en null', () => {
    const pagina = paginaMovimientosCajaSchema.parse({
      items: [{ idMovimientoCaja: 1, idTransaccion: null, naturaleza: 'I', monto: 500, fechaHora: null, observacion: null }],
      page: 1,
      pageSize: 10,
      total: 1,
    })
    expect(pagina.items).toHaveLength(1)
  })

  it('el body de apertura no admite campos que el backend no conoce', () => {
    expect(abrirJornadaSchema.safeParse({ idCajaFisica: 2, dineroInicial: 0 }).success).toBe(true)
    expect(abrirJornadaSchema.safeParse({ idCajaFisica: 2, dineroInicial: 0, idAgencia: '001' }).success).toBe(false)
    expect(abrirJornadaSchema.safeParse({ idCajaFisica: 2, dineroInicial: -1 }).success).toBe(false)
  })
})

describe('mensajes de la ventanilla', () => {
  it('explica los códigos de negocio de la apertura', () => {
    const conflicto = (codigo: string) => new ApiError('detalle del backend', 409, codigo)
    expect(mensajeErrorCaja(conflicto('CAJA_EN_USO'), 'abrir la jornada')).toMatch(/ya tiene una jornada abierta/)
    expect(mensajeErrorCaja(conflicto('CAJA_INACTIVA'), 'abrir la jornada')).toMatch(/inactiva/)
    expect(mensajeErrorCaja(new ApiError('x', 422, 'CAJA_FISICA_NO_ENCONTRADA'), 'abrir la jornada')).toMatch(/ya no existe/)
    expect(mensajeErrorCaja(new ApiError('x', 404, 'JORNADA_NO_ENCONTRADA'), 'consultar')).toMatch(/No encontramos la jornada/)
    expect(mensajeErrorCaja(new ApiError('x', 403, 'USUARIO_INTERNO_NO_VINCULADO'), 'consultar')).toMatch(/no está habilitado/)
  })

  it('un 403 sin código conocido habla del rol y un 409 desconocido muestra el detalle del backend', () => {
    expect(mensajeErrorCaja(new ApiError('x', 403, 'SIN_PERMISO'), 'abrir la jornada')).toBe('Tu rol no tiene permiso para abrir la jornada.')
    expect(mensajeErrorCaja(new ApiError('detalle del backend', 409, 'OTRO'), 'abrir la jornada')).toBe('detalle del backend')
  })

  it('una respuesta sin confirmar pide revisar antes de reintentar', () => {
    const incierta = new ApiError('No pudimos confirmar la apertura de la jornada.', 200, 'sin_confirmar')
    expect(operacionSinConfirmar(incierta)).toBe(true)
    expect(operacionSinConfirmar(new ApiError('x', 409, 'CAJA_EN_USO'))).toBe(false)
    expect(mensajeErrorCaja(incierta, 'abrir la jornada', true)).toMatch(/Actualiza la pantalla/)
    expect(mensajeErrorCaja(new ApiError('Network Error', null, 'network'), 'abrir la jornada', true)).toMatch(/Actualiza la pantalla/)
    expect(mensajeErrorCaja(new ApiError('trace interno', 503, 'http_503'), 'consultar tu jornada')).not.toMatch(/trace/)
  })
})

describe('formato de la ventanilla', () => {
  it('suma las dotaciones en centavos', () => {
    expect(totalDotado([{ monto: 0.1 }, { monto: 0.2 }, { monto: null }])).toBe(0.3)
  })

  it('pone el signo según la naturaleza', () => {
    expect(montoConSigno({ naturaleza: 'I', monto: 20 })).toMatch(/^\+/)
    expect(montoConSigno({ naturaleza: 'E', monto: 20 })).toMatch(/^−/)
    expect(montoConSigno({ naturaleza: null, monto: null })).toBe('—')
  })

  it('nombra la ventanilla y el tipo de movimiento aunque falten datos', () => {
    expect(nombreVentanilla({ idCajaFisica: 7, codigoCaja: '  ' })).toBe('Ventanilla 7')
    expect(nombreVentanilla({ idCajaFisica: 7, codigoCaja: 'C01' })).toBe('C01')
    const tipos = [{ idTipoMovimientoCaja: 4, codigo: 'DEP', descripcion: 'Depósito', naturaleza: 'I' as const }]
    expect(etiquetaTipoMovimiento({ idTipoMovimiento: 4, codigoTipoMovimiento: null }, tipos)).toBe('Depósito')
    expect(etiquetaTipoMovimiento({ idTipoMovimiento: 9, codigoTipoMovimiento: 'RET' }, tipos)).toBe('RET')
  })
})
