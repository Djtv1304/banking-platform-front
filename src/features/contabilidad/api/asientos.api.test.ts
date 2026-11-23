import { beforeEach, describe, expect, it, vi } from 'vitest'

import { actualizarAsiento, anularAsiento, crearAsiento, enviarAsiento, solicitarReverso } from '@/features/contabilidad/api/asientos.api'
import type { AsientoManual } from '@/features/contabilidad/api/asientos.contract'
import { apiClient } from '@/shared/api'

vi.mock('@/shared/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))

const asiento: AsientoManual = {
  concepto: 'Provisión de intereses',
  idAgencia: '001',
  lineas: [
    { idCuentaContable: 2, tipoMovimiento: 'DEBITO', monto: 10.5 },
    { idCuentaContable: 3, tipoMovimiento: 'CREDITO', monto: 10.5 },
  ],
}

beforeEach(() => vi.clearAllMocks())

describe('asientos manuales (E4-04, contrato propuesto)', () => {
  it('crea el borrador con POST y devuelve su id', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { idAsientoContable: 41 }, status: 201 })
    await expect(crearAsiento(asiento)).resolves.toEqual({ idAsientoContable: 41 })
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/contabilidad/asientos', asiento)
  })

  it('una respuesta sin id es un error de contrato, no un id inventado', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {}, status: 201 })
    await expect(crearAsiento(asiento)).rejects.toMatchObject({ code: 'respuesta_invalida' })
  })

  it('actualiza el borrador con PUT sobre su id', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: null, status: 200 })
    await actualizarAsiento(41, asiento)
    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/contabilidad/asientos/41', asiento)
  })

  it.each([[202, true], [200, false]])('el envío con %i queda pendiente = %s', async (status, pendiente) => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: null, status })
    await expect(enviarAsiento(41)).resolves.toEqual({ pendiente })
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/contabilidad/asientos/41/envio')
  })

  it('anula el borrador con el motivo en el cuerpo', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: null, status: 200 })
    await anularAsiento(41, 'Registrado por error')
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/contabilidad/asientos/41/anulacion', { motivo: 'Registrado por error' })
  })

  it.each([[202, true], [200, false]])('el reverso con %i queda pendiente = %s', async (status, pendiente) => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: null, status })
    await expect(solicitarReverso(41, 'Cuenta equivocada')).resolves.toEqual({ pendiente })
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/contabilidad/asientos/41/reverso', { motivo: 'Cuenta equivocada' })
  })
})
