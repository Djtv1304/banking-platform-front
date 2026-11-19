import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/shared/api'
import { cancelarConjunto, finalizarRestriccion, programarConjunto } from '@/features/organizacion/api/programacion.api'

vi.mock('@/shared/api', async importOriginal => {
  const original = await importOriginal<typeof import('@/shared/api')>()
  return { ...original, apiClient: { post: vi.fn(), put: vi.fn(), delete: vi.fn() } }
})

describe('E3-03: solicitudes pendientes, sin simular integracion SQL', () => {
  beforeEach(() => vi.clearAllMocks())
  it('solo acepta el contrato 202 de la cola', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ status: 200, data: { idSolicitud: 1 } })
    await expect(programarConjunto(1, 'condiciones', {})).rejects.toThrow('No se recibio')
    vi.mocked(apiClient.post).mockResolvedValue({ status: 202, data: { idSolicitud: 1, estado: 'Pendiente', requiereAprobacion: true } })
    await expect(programarConjunto(1, 'condiciones', {})).resolves.toMatchObject({ idSolicitud: 1 })
  })
  it('el lote se cancela por solicitud y el fin de restriccion se solicita', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({ status: 202, data: { idSolicitud: 2, estado: 'Pendiente', requiereAprobacion: true } })
    await cancelarConjunto(3, 'cupos', 4)
    expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/productos/subproductos/3/cupos/programaciones/4')
    vi.mocked(apiClient.post).mockResolvedValue({ status: 202, data: { idSolicitud: 3, estado: 'Pendiente', requiereAprobacion: true } })
    await finalizarRestriccion(3, 8, '2026-12-01')
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/productos/subproductos/3/restricciones/8/fin', { vigenciaHasta: '2026-12-01' })
  })
})
