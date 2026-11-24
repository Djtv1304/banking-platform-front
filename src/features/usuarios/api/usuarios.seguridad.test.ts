import { describe, expect, it, vi } from 'vitest'
import { ApiError, apiClient } from '@/shared/api'
import { cambiarRolUsuario, cambioSinConfirmar, mensajeErrorCambio } from '@/features/usuarios/api/usuarios.api'

describe('E1-04 respuestas simuladas', () => {
  it('valida el 202 como solicitud pendiente', async () => {
    const put = vi.spyOn(apiClient, 'put').mockResolvedValueOnce({
      status: 202, data: { idSolicitud: 123, estado: 'Pendiente', requiereAprobacion: true },
    })
    try {
      await expect(cambiarRolUsuario(32, ['CAJERO'])).resolves.toMatchObject({
        tipo: 'solicitud', solicitud: { idSolicitud: 123, estado: 'Pendiente' },
      })
      expect(put).toHaveBeenCalledWith('/api/v1/usuarios/32/roles', { roles: ['CAJERO'] })
    } finally {
      put.mockRestore()
    }
  })

  it('trata un 202 sin ID como una escritura sin confirmar', async () => {
    const put = vi.spyOn(apiClient, 'put').mockResolvedValueOnce({ status: 202, data: {} })
    try {
      const error = await cambiarRolUsuario(32, ['CAJERO']).catch((error: unknown) => error)
      expect(error).toMatchObject({ status: 202, code: 'respuesta_invalida' })
      expect(cambioSinConfirmar(error)).toBe(true)
      expect(put).toHaveBeenCalledTimes(1)
    } finally {
      put.mockRestore()
    }
  })

  it.each([
    [503, 'CORREO_EN_CONCILIACION', true],
    [503, 'ROLES_PENDIENTES_CONFIRMACION', true],
    [503, 'WORKOS_NO_DISPONIBLE', true],
    [409, 'USUARIO_EN_CONCILIACION', true],
    [409, 'ASIGNACIONES_CAJA_OCUPADAS', true],
    [503, 'POLITICA_ROLES_NO_CONFIGURADA', false],
    [503, 'OPERACION_NO_CONFIGURADA', false],
    [403, 'SIN_PERMISO', false],
    [422, 'ROLES_INCOMPATIBLES', false],
    [422, 'NIVEL_INSUFICIENTE', false],
  ] as const)('maneja %s %s', (status, code, requiereConsulta) => {
    const error = new ApiError('respuesta del servidor', status, code)
    expect(cambioSinConfirmar(error)).toBe(requiereConsulta)
    expect(mensajeErrorCambio(error)).not.toBe(error.message)
  })
})
