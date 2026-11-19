import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/shared/api'
import { obtenerNumeracion, previsualizarNumeracion, solicitarNumeracion } from './numeracion.api'
import { reglaNumeracionSchema } from './numeracion.contract'

vi.mock('@/shared/api', async importOriginal => {
  const original = await importOriginal<typeof import('@/shared/api')>()
  return { ...original, apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }
})
const regla = { prefijo: '2200', incluyeAgencia: false, longitudSecuencia: 8, algoritmoVerificador: 'NINGUNO' as const }
describe('E3-04: contratos HTTP, sin sustituir pruebas SQL reales', () => {
  beforeEach(() => vi.clearAllMocks())
  it.each(['', 'AH', '12.3', '1234567'])('rechaza prefijo invalido %s', prefijo => {
    expect(reglaNumeracionSchema.safeParse({ ...regla, prefijo }).success).toBe(false)
  })
  it('rechaza campos de uso o contador enviados por el cliente', () => {
    expect(reglaNumeracionSchema.safeParse({ ...regla, usada: false }).success).toBe(false)
    expect(reglaNumeracionSchema.safeParse({ ...regla, ultimoNumero: 14 }).success).toBe(false)
  })
  it('previsualiza sin solicitar ni reservar numeros', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { ejemplo: '220000000015', estadoSecuencia: 'DISPONIBLE', agenciaEjemplo: '001' } })
    await expect(previsualizarNumeracion(3, regla)).resolves.toMatchObject({ ejemplo: '220000000015' })
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/productos/subproductos/3/numeracion/ejemplo', { regla, idAgencia: null }, { signal: undefined })
    expect(apiClient.put).not.toHaveBeenCalled()
  })
  it('solo acepta 202 pendiente, nunca una aplicacion directa 200', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ status: 200, data: { idSolicitud: 9 } })
    await expect(solicitarNumeracion(3, regla)).rejects.toThrow('No se confirmo')
    vi.mocked(apiClient.put).mockResolvedValue({ status: 202, data: { idSolicitud: 9, estado: 'Pendiente', requiereAprobacion: true } })
    await expect(solicitarNumeracion(3, regla)).resolves.toMatchObject({ idSolicitud: 9 })
  })
  it('conserva estado agotado sin inventar un ejemplo', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { regla: null, usada: true, historial: [], solicitudPendiente: null, ejemplo: null, estadoSecuencia: 'AGOTADA', agenciaEjemplo: '001' } })
    await expect(obtenerNumeracion(3)).resolves.toMatchObject({ ejemplo: null, estadoSecuencia: 'AGOTADA' })
  })
  it('propaga el error real de regla en uso para mostrarlo', async () => {
    const error = new Error('La regla ya tiene cuentas y no se puede cambiar.')
    vi.mocked(apiClient.put).mockRejectedValue(error)
    await expect(solicitarNumeracion(3, regla)).rejects.toBe(error)
  })
})
