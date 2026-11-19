import { describe, expect, it } from 'vitest'

import { aceptadaSchema } from '@/shared/api'
import { comentarioSchema, resultadoSchema } from '@/features/aprobaciones/api/aprobaciones.contract'
import { toApiError } from '@/shared/api'

describe('contrato de doble autorizacion', () => {
  it('solo acepta una solicitud pendiente persistida y con ID seguro', () => {
    expect(aceptadaSchema.safeParse({ idSolicitud: 12, estado: 'Pendiente', requiereAprobacion: true }).success).toBe(true)
    expect(aceptadaSchema.safeParse({ idSolicitud: 12, estado: 'Ejecutada', requiereAprobacion: true }).success).toBe(false)
    expect(aceptadaSchema.safeParse({ idSolicitud: 12, estado: 'Pendiente', requiereAprobacion: false }).success).toBe(false)
    expect(aceptadaSchema.safeParse({ idSolicitud: Number.MAX_SAFE_INTEGER + 1, estado: 'Pendiente', requiereAprobacion: true }).success).toBe(false)
  })
  it.each(['', ' ', '\n\t'])('rechazo exige un comentario con contenido: %j', (comentario) => {
    expect(comentarioSchema('rechazar').safeParse({ comentario }).success).toBe(false)
  })
  it('aprobar y cancelar permiten comentario vacio; todos limitan su longitud', () => {
    expect(comentarioSchema('aprobar').safeParse({ comentario: '' }).success).toBe(true)
    expect(comentarioSchema('cancelar').safeParse({ comentario: '' }).success).toBe(true)
    expect(comentarioSchema('rechazar').safeParse({ comentario: 'x'.repeat(301) }).success).toBe(false)
  })
  it('aprobada y ejecutada siguen siendo estados distintos', () => {
    expect(resultadoSchema.parse({ idSolicitud: 12, estado: 'Aprobada' }).estado).not.toBe('Ejecutada')
    expect(resultadoSchema.safeParse({ idSolicitud: 12, estado: 'Exitoso' }).success).toBe(false)
  })
  it('conserva el mensaje y la correlacion de un error real del backend', () => {
    const error = toApiError({ isAxiosError: true, response: { status: 409, data: { code: 'SOLICITUD_DESACTUALIZADA', detail: 'El objetivo cambio desde la solicitud.', traceId: 'qa-correlacion' } } })
    expect(error.status).toBe(409)
    expect(error.code).toBe('SOLICITUD_DESACTUALIZADA')
    expect(error.message).toBe('El objetivo cambio desde la solicitud.')
    expect(error.traceId).toBe('qa-correlacion')
  })
})
