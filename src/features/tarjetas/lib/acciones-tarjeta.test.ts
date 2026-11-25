import { describe, expect, it } from 'vitest'

import { ApiError } from '@/shared/api'
import {
  accionesEstado,
  admiteRegenerarPin,
  admiteSobrePin,
  armarMotivoBloqueo,
  bloqueoFormSchema,
  esIrreversible,
  formatearFechaHora,
  MAX_DETALLE_BLOQUEO,
  mensajeCambioEstado,
  mensajeErrorAccionTarjeta,
  motivoFormSchema,
  permisosTarjeta,
  SOBRE_YA_DESCARGADO,
} from '@/features/tarjetas/lib/acciones-tarjeta'

const destinos = (estado: string) => accionesEstado(estado).map((accion) => accion.destino)

describe('accionesEstado', () => {
  it('ofrece las transiciones de Tarjeta.TransicionEstado', () => {
    expect(destinos('Solicitada')).toEqual(['Aprobada', 'Anulada'])
    expect(destinos('Aprobada')).toEqual(['Generada', 'Anulada'])
    expect(destinos('Activa')).toEqual(['Bloqueada', 'Inactiva', 'Cancelada', 'Vencida', 'Cerrada'])
    expect(destinos('Bloqueada')).toEqual(['Activa', 'Cancelada'])
    expect(destinos('Inactiva')).toEqual(['Activa', 'Cancelada', 'Cerrada'])
    expect(destinos('Vencida')).toEqual(['Cerrada'])
  })

  it('permite confirmar la entrega de una Generada y anularla', () => {
    expect(destinos('Generada')).toEqual(['Activa', 'Anulada'])
  })

  it('un estado terminal o desconocido no ofrece nada', () => {
    for (const estado of ['Anulada', 'Cancelada', 'Cerrada', 'Suspendida']) expect(destinos(estado)).toEqual([])
  })

  it('nombra cada acción según el estado de origen', () => {
    expect(accionesEstado('Bloqueada')[0].etiqueta).toBe('Desbloquear')
    expect(accionesEstado('Inactiva')[0].etiqueta).toBe('Reactivar')
    expect(accionesEstado('Solicitada')[1].etiqueta).toBe('Anular solicitud')
    expect(accionesEstado('Aprobada')[0].etiqueta).toBe('Registrar emisión')
  })

  it('Anulada, Cancelada y Cerrada no se pueden deshacer', () => {
    expect(['Anulada', 'Cancelada', 'Cerrada'].every((e) => esIrreversible(e as 'Anulada'))).toBe(true)
    expect(esIrreversible('Bloqueada')).toBe(false)
  })
})

describe('PIN y sobre', () => {
  it('regenerar el PIN pide PIN asignado y un estado no terminal', () => {
    expect(admiteRegenerarPin({ pinAsignado: true, estadoActual: 'Bloqueada' })).toBe(true)
    expect(admiteRegenerarPin({ pinAsignado: false, estadoActual: 'Activa' })).toBe(false)
    expect(admiteRegenerarPin({ pinAsignado: true, estadoActual: 'Cancelada' })).toBe(false)
  })

  it('el sobre de PIN solo existe en débito con PIN', () => {
    expect(admiteSobrePin({ pinAsignado: true, tipoTarjeta: 'Debito', estadoActual: 'Aprobada' })).toBe(true)
    expect(admiteSobrePin({ pinAsignado: true, tipoTarjeta: 'Debito', estadoActual: 'Bloqueada' })).toBe(true)
    expect(admiteSobrePin({ pinAsignado: true, tipoTarjeta: 'Credito', estadoActual: 'Aprobada' })).toBe(false)
    expect(admiteSobrePin({ pinAsignado: false, tipoTarjeta: 'Debito', estadoActual: 'Aprobada' })).toBe(false)
    for (const estadoActual of ['Cancelada', 'Anulada', 'Vencida', 'Cerrada']) {
      expect(admiteSobrePin({ pinAsignado: true, tipoTarjeta: 'Debito', estadoActual })).toBe(false)
    }
  })
})

describe('permisosTarjeta', () => {
  it('cambiar estado y regenerar PIN dependen de los permisos de WorkOS', () => {
    expect(permisosTarjeta(['ASESOR'], ['tarjetasEstado'])).toMatchObject({ estado: true, pin: false })
    expect(permisosTarjeta(['ASESOR'], ['tarjetasEmitir'])).toMatchObject({ estado: false, pin: true })
  })

  it('el sobre es para ASESOR, SUPERVISOR y ADMIN; el historial para SUPERVISOR, AUDITOR y ADMIN', () => {
    expect(permisosTarjeta(['asesor'], [])).toMatchObject({ sobrePin: true, historial: false })
    expect(permisosTarjeta(['AUDITOR'], [])).toMatchObject({ sobrePin: false, historial: true })
    expect(permisosTarjeta(['SUPERVISOR'], [])).toMatchObject({ sobrePin: true, historial: true })
    expect(permisosTarjeta(['CAJERO'], [])).toEqual({ estado: false, pin: false, sobrePin: false, historial: false })
  })
})

describe('motivoFormSchema', () => {
  it('el motivo es obligatorio', () => {
    const result = motivoFormSchema.safeParse({ motivo: '   \n ' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('Escribe el motivo del cambio.')
  })

  it('convierte saltos de línea en espacios y recorta', () => {
    expect(motivoFormSchema.parse({ motivo: '  Pedido\n del   cliente ' }).motivo).toBe('Pedido del cliente')
  })

  it('admite hasta 500 caracteres y rechaza caracteres de control', () => {
    expect(motivoFormSchema.safeParse({ motivo: 'a'.repeat(500) }).success).toBe(true)
    expect(motivoFormSchema.safeParse({ motivo: 'a'.repeat(501) }).success).toBe(false)
    expect(motivoFormSchema.safeParse({ motivo: 'mal\u0000texto' }).success).toBe(false)
  })
})

describe('motivo de bloqueo', () => {
  it('arma «Causa: detalle» o solo la causa', () => {
    expect(armarMotivoBloqueo('Robo', ' reportado en agencia ')).toBe('Robo: reportado en agencia')
    expect(armarMotivoBloqueo('Pérdida', '  ')).toBe('Pérdida')
  })

  it('pide la causa y deja el detalle opcional', () => {
    expect(bloqueoFormSchema.safeParse({ causa: '', detalle: '' }).error?.issues[0].message).toBe(
      'Elige la causa del bloqueo.',
    )
    expect(bloqueoFormSchema.parse({ causa: 'Sospecha de fraude', detalle: '' })).toEqual({
      motivo: 'Sospecha de fraude',
      codigoMotivo: 'SOSPECHA_FRAUDE',
    })
  })

  it('con la causa «Otra» el detalle es obligatorio', () => {
    const sinDetalle = bloqueoFormSchema.safeParse({ causa: 'Otra', detalle: '   ' })
    expect(sinDetalle.error?.issues[0]).toMatchObject({
      path: ['detalle'],
      message: 'Con la causa «Otra», describe el motivo del bloqueo.',
    })
    expect(bloqueoFormSchema.parse({ causa: 'Otra', detalle: 'Tarjeta retenida en el ATM' })).toEqual({
      motivo: 'Otra: Tarjeta retenida en el ATM',
      codigoMotivo: 'OTRA',
    })
  })

  it('causa y detalle juntos nunca pasan de 500', () => {
    const largo = bloqueoFormSchema.parse({ causa: 'Sospecha de fraude', detalle: 'x'.repeat(MAX_DETALLE_BLOQUEO) })
    expect(largo.motivo.length).toBe(500)
    expect(bloqueoFormSchema.safeParse({ causa: 'Robo', detalle: 'x'.repeat(MAX_DETALLE_BLOQUEO + 1) }).success).toBe(false)
  })
})

describe('mensajes', () => {
  const fecha = new Date('2026-11-17T15:15:00Z')

  it('la hora del cambio sale en hora de Ecuador', () => {
    expect(formatearFechaHora(fecha)).toContain('17 de noviembre de 2026')
    expect(formatearFechaHora(fecha)).toContain('10:15')
    expect(formatearFechaHora('2026-11-17T10:15:00-05:00')).toContain('10:15')
  })

  it('al aprobar una de débito avisa que el sobre de PIN ya se puede descargar', () => {
    expect(mensajeCambioEstado('Aprobada', { tipoTarjeta: 'Debito' }, fecha)).toContain('sobre de PIN')
    expect(mensajeCambioEstado('Aprobada', { tipoTarjeta: 'Credito' }, fecha)).not.toContain('sobre de PIN')
    expect(mensajeCambioEstado('Bloqueada', { tipoTarjeta: 'Debito' }, fecha)).toContain('Bloqueada')
  })

  it('SOBRE_PIN_ENTREGADO explica que hay que regenerar el PIN', () => {
    const error = new ApiError('El sobre de PIN ya se entregó', 409, 'SOBRE_PIN_ENTREGADO')
    expect(mensajeErrorAccionTarjeta(error, 'sobrePin')).toBe(SOBRE_YA_DESCARGADO)
  })

  it('403 dice qué permiso falta y 503 que el servicio de PIN no está disponible', () => {
    expect(mensajeErrorAccionTarjeta(new ApiError('x', 403, 'FORBIDDEN'), 'pin')).toContain('regenerar el PIN')
    expect(mensajeErrorAccionTarjeta(new ApiError('x', 503, 'HSM_NO_DISPONIBLE'), 'estado')).toContain('Inténtalo más tarde')
    expect(mensajeErrorAccionTarjeta(new ApiError('x', 503, 'PIN_ASIGNACION_NO_CONFIRMADA'), 'pin')).toContain(
      'No lo intentes de nuevo',
    )
  })

  it('las reglas de negocio tienen texto propio y lo demás usa el del backend', () => {
    expect(mensajeErrorAccionTarjeta(new ApiError('x', 409, 'ACTIVACION_AUTOMATICA'), 'estado')).toContain('se activa sola')
    expect(mensajeErrorAccionTarjeta(new ApiError('Otro error', 409, 'OTRO'), 'estado')).toBe('Otro error')
  })
})
