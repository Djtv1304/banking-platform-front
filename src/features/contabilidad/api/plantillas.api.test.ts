import { describe, expect, it, vi } from 'vitest'
import { consultarAuxiliares, consultarPlantilla, consultarSolicitudPlantilla, crearVersion, listarPlantillas, opcionesLinea, prepararLineas, simularPlantilla } from '@/features/contabilidad/api/plantillas.api'
import { apiClient } from '@/shared/api'

vi.mock('@/shared/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }))

const metadatos = { Origen: 'CAJA', IdTipoAsiento: 3, IdConceptoContable: 1, CodigoTipoAsiento: 'RET',
  NombreTipoAsiento: 'Retiro', CodigoConcepto: 'RET', ConceptoDetalle: 'Retiro de efectivo' }

describe('versiones de plantillas contables', () => {
  it('acepta los Decimal como texto devueltos por el backend al simular', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {
      total: '100.50', lineas: [{ cuenta: 1, lado: 'DEBITO', monto: '100.50' }],
    } })
    const entrada = { lineas: [], montos: {}, producto: {}, contraproducto: {}, comision: null }
    await expect(simularPlantilla(entrada)).resolves.toEqual({
      total: 100.5, lineas: [{ cuenta: 1, lado: 'DEBITO', monto: 100.5 }],
    })
  })

  it.each([null, true, '', 'incorrecto', '1e999'])('rechaza importes inválidos de simulación: %s', async total => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { total, lineas: [] } })
    await expect(simularPlantilla({ lineas: [], montos: {}, producto: {}, contraproducto: {}, comision: null })).rejects.toThrow()
  })
  it('combina los filtros del listado global', async () => {
    const versiones = [{
      IdPlantillaAsiento: 2, CodigoPlantilla: 'RETIRO', Version: 2, Nombre: 'Retiro',
      VigenciaDesde: '2026-11-21', VigenciaHasta: null, Estado: false, ...metadatos,
    }]
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: versiones })

    const params = { q: 'Ret', codigo: 'RETIRO', estado: 0 as const, origen: 'CAJA', idTipoAsiento: 3 }
    await expect(listarPlantillas(params)).resolves.toEqual(versiones)
    expect(apiClient.get).toHaveBeenLastCalledWith('/api/v1/contabilidad/plantillas', { params, signal: undefined })
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
      VigenciaDesde: '2026-11-19', VigenciaHasta: null, Estado: true, ...metadatos,
      lineas: [
        { TipoMovimiento: 'DEBITO', OrigenCuenta: 'FIJA', ComponenteImporte: 'PRINCIPAL', IdCuentaContable: 42, CodigoRol: null,
          Orden: 1, CodigoCuenta: '11010101', NombreCuenta: 'Caja auxiliar' },
        { TipoMovimiento: 'CREDITO', OrigenCuenta: 'PRODUCTO', ComponenteImporte: 'PRINCIPAL', IdCuentaContable: null, CodigoRol: 'CAPITAL',
          Orden: 2, CodigoCuenta: null, NombreCuenta: null },
      ],
    } })
    const lineas = prepararLineas(await consultarPlantilla(1))
    expect(lineas).toEqual([
      { lado: 'DEBITO', origen: 'FIJA', base: 'PRINCIPAL', cuenta: 42, rol: null },
      { lado: 'CREDITO', origen: 'PRODUCTO', base: 'PRINCIPAL', cuenta: null, rol: 'CAPITAL' },
    ])
    const entrada = { codigoPlantilla: 'RETIRO', vigenciaDesde: '2026-11-21', nombre: 'Retiro', lineas }
    vi.mocked(apiClient.post).mockResolvedValue({ status: 202, data: { idPlantillaAsiento: 2, idSolicitud: 9 } })
    await expect(crearVersion(3, entrada)).resolves.toEqual({ idPlantillaAsiento: 2, idSolicitud: 9 })
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/contabilidad/tipos-asiento/3/plantillas', entrada)
  })

  it('conserva ambas bases de prima al preparar, simular y registrar una versión E4-03', async () => {
    const bases = ['PRIMA_FIJA', 'PRIMA_VARIABLE'] as const
    const lados = ['DEBITO', 'CREDITO'] as const
    const detalle = bases.flatMap(base => lados.map(lado => ({
      TipoMovimiento: lado, OrigenCuenta: 'FIJA', ComponenteImporte: base,
      IdCuentaContable: 42, CodigoRol: null, CodigoCuenta: '450420', NombreCuenta: 'Prima',
    }))).map((linea, i) => ({ ...linea, Orden: i + 1 }))
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: {
      IdPlantillaAsiento: 1, CodigoPlantilla: 'CON_PRIMA_SEGURO_DEPOSITOS', Version: 1,
      Nombre: 'Seguro de depósitos', VigenciaDesde: '2026-11-19', VigenciaHasta: null,
      Estado: true, ...metadatos, lineas: detalle,
    } })

    expect(opcionesLinea.base).toEqual(expect.arrayContaining([...bases]))
    const lineas = prepararLineas(await consultarPlantilla(1))
    expect(lineas.map(linea => linea.base)).toEqual(['PRIMA_FIJA', 'PRIMA_FIJA', 'PRIMA_VARIABLE', 'PRIMA_VARIABLE'])
    const simulacion = { lineas, montos: { PRIMA_FIJA: '5', PRIMA_VARIABLE: '2' }, producto: {}, contraproducto: {}, comision: null }
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { total: '7', lineas: [] } })
    await expect(simularPlantilla(simulacion)).resolves.toEqual({ total: 7, lineas: [] })
    expect(apiClient.post).toHaveBeenLastCalledWith('/api/v1/contabilidad/plantillas/simulaciones', simulacion)

    const version = { codigoPlantilla: 'CON_PRIMA_SEGURO_DEPOSITOS', nombre: 'Seguro de depósitos', vigenciaDesde: '2026-11-27', lineas }
    vi.mocked(apiClient.post).mockResolvedValueOnce({ status: 202, data: { idPlantillaAsiento: 2, idSolicitud: 9 } })
    await expect(crearVersion(3, version)).resolves.toEqual({ idPlantillaAsiento: 2, idSolicitud: 9 })
    expect(apiClient.post).toHaveBeenLastCalledWith('/api/v1/contabilidad/tipos-asiento/3/plantillas', version)
  })

  it('acepta una solicitud no visible como null', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: null })
    await expect(consultarSolicitudPlantilla(1)).resolves.toBeNull()
  })

  it('ofrece cuentas hoja activas e imputables, incluidas las de seis dígitos', async () => {
    const cuenta = { idCuentaContable: 42, codigoCuenta: '11010101', nombreCuenta: 'Caja auxiliar',
      estado: 'Activo', esImputable: true, idCuentaSuperior: 11, saldo: 0, naturaleza: 'DEUDORA' }
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [
      cuenta, { ...cuenta, idCuentaContable: 11, codigoCuenta: '110101' },
      { ...cuenta, idCuentaContable: 43, estado: 'Inactivo' },
      { ...cuenta, idCuentaContable: 44, esImputable: false },
      { ...cuenta, idCuentaContable: 45, codigoCuenta: '299005' },
    ] })
    await expect(consultarAuxiliares()).resolves.toEqual([cuenta, { ...cuenta, idCuentaContable: 45, codigoCuenta: '299005' }])
    expect(apiClient.get).toHaveBeenLastCalledWith('/api/v1/contabilidad/cuentas-contables', { signal: undefined })
  })
})
