import { describe, expect, it, vi } from 'vitest'
import { consultarPlantilla, crearVersion, listarPlantillas, prepararLineas, simularPlantilla } from '@/features/contabilidad/api/plantillas.api'
import { apiClient } from '@/shared/api'

vi.mock('@/shared/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }))

describe('versiones de plantillas contables', () => {
  it('consulta las versiones publicadas del tipo de asiento seleccionado', async () => {
    const versiones = [{
      IdPlantillaAsiento: 2, CodigoPlantilla: 'RETIRO', Version: 2, Nombre: 'Retiro',
      VigenciaDesde: '2026-11-21', VigenciaHasta: null, Estado: false,
    }]
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: versiones })

    await expect(listarPlantillas(3)).resolves.toEqual(versiones)
    expect(apiClient.get).toHaveBeenLastCalledWith('/api/v1/contabilidad/tipos-asiento/3/plantillas', { signal: undefined })
  })

  it('envía la simulación al motor y muestra el resultado devuelto', async () => {
    const entrada: Parameters<typeof simularPlantilla>[0] = {
      lineas: [
        { lado: 'DEBITO', origen: 'FIJA', base: 'PRINCIPAL', cuenta: 42, rol: null },
        { lado: 'CREDITO', origen: 'PRODUCTO', base: 'PRINCIPAL', cuenta: null, rol: 'CAPITAL' },
      ],
      montos: { PRINCIPAL: '10.50' },
      producto: { CAPITAL: 45 },
      contraproducto: {},
      comision: null,
    }
    const resultado = { total: 10.5, lineas: [{ cuenta: 42, lado: 'DEBITO', monto: 10.5 }, { cuenta: 45, lado: 'CREDITO', monto: 10.5 }] }
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: resultado })

    await expect(simularPlantilla(entrada)).resolves.toEqual(resultado)
    expect(apiClient.post).toHaveBeenLastCalledWith('/api/v1/contabilidad/plantillas/simulaciones', entrada)
  })

  it('convierte la respuesta del detalle en los campos aceptados al crear', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: {
      IdPlantillaAsiento: 1, CodigoPlantilla: 'RETIRO', Version: 2, Nombre: 'Retiro',
      VigenciaDesde: '2026-11-19', VigenciaHasta: null, Estado: true,
      lineas: [
        { TipoMovimiento: 'DEBITO', OrigenCuenta: 'FIJA', ComponenteImporte: 'PRINCIPAL', IdCuentaContable: 42, CodigoRol: null, EsImputable: true },
        { TipoMovimiento: 'CREDITO', OrigenCuenta: 'PRODUCTO', ComponenteImporte: 'PRINCIPAL', IdCuentaContable: null, CodigoRol: 'CAPITAL' },
      ],
    } })
    const lineas = prepararLineas(await consultarPlantilla(1))
    expect(lineas).toEqual([
      { lado: 'DEBITO', origen: 'FIJA', base: 'PRINCIPAL', cuenta: 42, rol: null },
      { lado: 'CREDITO', origen: 'PRODUCTO', base: 'PRINCIPAL', cuenta: null, rol: 'CAPITAL' },
    ])
    const entrada = { codigoPlantilla: 'RETIRO', vigenciaDesde: '2026-11-21', nombre: 'Retiro', lineas }
    vi.mocked(apiClient.post).mockResolvedValue({ status: 202, data: { idPlantillaAsiento: 2 } })
    await expect(crearVersion(3, entrada)).resolves.toEqual({ idPlantillaAsiento: 2 })
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/contabilidad/tipos-asiento/3/plantillas', entrada)
  })
})
