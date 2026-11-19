import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { detalleSchema } from '@/features/aprobaciones/api/aprobaciones.contract'
import { LineaVigencias } from '@/features/organizacion/components/LineaVigencias'
import { HistorialSolicitudesProducto } from '@/features/organizacion/components/HistorialSolicitudesProducto'
import { FichaCambioProducto } from '@/features/organizacion/components/FichaCambioProducto'
import { compararProducto, filtrarSolicitudes } from '@/features/organizacion/lib/cambios-producto'

vi.mock('@/shared/ui', async () => ({ ...await import('@/shared/ui/aviso'), ...await import('@/shared/ui/button'), ...await import('@/shared/ui/dialog'), ...await import('@/shared/ui/input') }))

const datos = { vigenciaDesde: '2026-12-01', vigenciaHasta: null, montoAperturaMinimo: '75', saldoMinimo: '10', tasaInteresAnual: '1.5', periodicidadInteres: 'Mensual', costoMantenimiento: '0', periodicidadCosto: null, mesesInactividad: 12, aplicaACuentasExistentes: false }
const previo = { IdCondicion: 1, Estado: 'Vigente', VigenciaDesde: '2026-01-01', VigenciaHasta: null, MontoAperturaMinimo: '50.00', SaldoMinimo: '10.00', TasaInteresAnual: '1.5000', PeriodicidadInteres: 'Mensual', CostoMantenimiento: '0.00', PeriodicidadCosto: null, MesesInactividad: 12, AplicaACuentasExistentes: false }
function solicitud(propuesta: Record<string, unknown> = { clase: 'condiciones', accion: 'programar', datos }, registros: unknown[] = [previo]) {
  return detalleSchema.parse({ idSolicitud: 9, codigoTransaccion: 'PRD-CONDICION', tipoObjetivo: 'SubProducto', idObjetivo: '13', idAgencia: null, estado: 'Ejecutada', fechaSolicitud: '2026-11-18T15:00:00Z', solicitante: { sujeto: 'user_fixture', nombre: 'Persona QA', idInterno: 12 }, resolutor: { sujeto: 'user_checker', nombre: 'Supervisor QA', idInterno: 13 }, fechaResolucion: '2026-11-19T15:00:00Z', comentario: null, codigoError: null, puedeAprobar: false, puedeRechazar: false, puedeCancelar: false, antes: { registros }, despues: { subproducto: { nombre: 'Ahorro Flexible' }, propuesta }, eventos: [{ estadoAnterior: 'Aprobada', estadoNuevo: 'Ejecutada', responsable: null, comentario: null, fechaEvento: '2026-11-19T15:01:00Z' }] })
}

describe('fichas verticales de vigencias', () => {
  it('muestra pares de etiqueta y valor sin tabla ancha ni redondear importes', () => {
    const html = renderToStaticMarkup(<LineaVigencias eventos={[{ id: 1, titulo: 'Ventanilla', desde: '2026-11-19', hasta: null, estado: 'Vigente', responsable: 'Persona QA (12)', valores: { 'Monto maximo por transaccion (USD)': '9007199254740991.99' } }]} />)
    for (const valor of ['<dl', '<dt', '<dd', 'Monto maximo por transaccion (USD)', '9007199254740991.99', 'Sin fecha final', '19/11/2026', 'Vigente', 'Persona QA (12)']) expect(html).toContain(valor)
    expect(html).not.toContain('<table')
    expect(html).not.toContain('overflow-x-auto')
  })
  it('conserva cancelar junto al conjunto programado', () => {
    const html = renderToStaticMarkup(<LineaVigencias eventos={[{ id: 2, titulo: 'Ventanilla', desde: '2026-12-01', hasta: '2026-12-31', estado: 'Programado', responsable: 'Persona QA (12)' }]} acciones={v => <button data-id={v.id}>Cancelar programacion</button>} />)
    expect(html).toContain('data-id="2"')
    expect(html).toContain('31/12/2026')
  })
})

describe('historial breve con ficha completa congelada', () => {
  it('el resumen muestra solo el valor modificado y la fecha real de ejecucion', () => {
    const cliente = new QueryClient()
    cliente.setQueryData(['aprobaciones', 'detalle', 9], solicitud())
    const html = renderToStaticMarkup(<QueryClientProvider client={cliente}><MemoryRouter><HistorialSolicitudesProducto solicitudes={[{ idSolicitud: 9, estado: 'Ejecutada', fecha: '2026-11-18T15:00:00Z', responsable: 'Persona QA (12)', clase: 'condiciones', accion: 'programar', datos }]} /></MemoryRouter></QueryClientProvider>)
    for (const valor of ['Monto minimo de apertura (USD)', '75', 'Ver detalle', '2026-11-19T15:01:00Z', 'Aplicado el']) expect(html).toContain(valor)
    expect(html).not.toContain('Saldo minimo requerido')
    expect(html).not.toContain('<table')
  })
  it('la ficha completa conserva tambien los valores que no cambiaron', () => {
    const html = renderToStaticMarkup(<FichaCambioProducto solicitud={solicitud()} canales={[]} />)
    for (const valor of ['Antes del cambio', 'Despues del cambio', 'Saldo minimo requerido (USD)', '10.00', 'Tasa de interes anual (%)', '1.5000', 'Periodicidad del interes', 'Mensual', '50.00', '75', 'Supervisor QA (13)']) expect(html).toContain(valor)
    expect(html).not.toContain('IdCondicion')
    expect(html).not.toContain('<table')
  })
  it('normaliza decimales sin presentar cambios falsos', () => {
    const comparacion = compararProducto(solicitud())
    expect(comparacion.cambios.map(c => c.campo)).toEqual(['montoAperturaMinimo'])
  })
  it('detalla todos los canales pero resume solo el limite que cambio', () => {
    const cupo = { cupoDiarioMaximo: '1000', cupoMensualMaximo: '5000', montoMaxTransaccion: '100', maxTransaccionesDia: 10 }
    const viejo = { EstadoCupo: 'A', VigenciaDesde: '2026-01-01', VigenciaHasta: null, CupoDiarioMaximo: '1000', CupoMensualMaximo: '5000', MontoMaxTransaccion: '100', MaxTransaccionesDia: 10 }
    const s = solicitud({ clase: 'cupos', accion: 'programar', datos: { vigenciaDesde: '2026-12-01', cupos: [{ idCanal: 1, ...cupo, montoMaxTransaccion: '200' }, { idCanal: 2, ...cupo }] } }, [{ ...viejo, IdCanal: 1 }, { ...viejo, IdCanal: 2 }])
    const c = compararProducto(s, [{ idCanal: 1, nombreCanal: 'Ventanilla' }, { idCanal: 2, nombreCanal: 'Cajero' }])
    expect(c.cambios).toHaveLength(1)
    expect(c.cambios[0]).toMatchObject({ campo: 'montoMaxTransaccion', grupo: 'Ventanilla', valor: '200' })
    expect(c.antes).toHaveLength(2)
    expect(c.despues).toHaveLength(2)
  })
  it('no inventa una configuracion anterior cuando no existe', () => {
    const html = renderToStaticMarkup(<FichaCambioProducto solicitud={solicitud(undefined, [])} canales={[]} />)
    expect(html).toContain('No hay un conjunto anterior registrado')
  })
  it('las solicitudes pendientes no se presentan como cambios aplicados', () => {
    const html = renderToStaticMarkup(<QueryClientProvider client={new QueryClient()}><MemoryRouter><HistorialSolicitudesProducto solicitudes={[{ idSolicitud: 9, estado: 'Pendiente', fecha: '2026-11-18T15:00:00Z', responsable: 'Persona QA (12)', clase: 'condiciones', accion: 'programar', datos }]} /></MemoryRouter></QueryClientProvider>)
    expect(html).toContain('No hay cambios aplicados')
    expect(html).toContain('Solicitudes sin cambios aplicados')
    expect(html).toContain('/aprobaciones/9')
  })
})


describe('filtros locales del historial', () => {
  const filas = [
    { idSolicitud: 1, estado: 'Ejecutada' as const, fecha: '2026-11-20T03:00:00Z', responsable: 'Jose Casa(12)', clase: 'condiciones' as const, accion: 'programar' as const },
    { idSolicitud: 2, estado: 'Ejecutada' as const, fecha: '2026-11-20T06:00:00Z', responsable: 'Persona QA(112)', clase: 'cupos' as const, accion: 'programar' as const },
  ]
  it('incluye los limites de fecha usando el dia de Ecuador', () => {
    expect(filtrarSolicitudes(filas, { desde: '2026-11-19', hasta: '2026-11-19', usuario: '' }).map(v => v.idSolicitud)).toEqual([1])
  })
  it('busca nombres sin distinguir mayusculas y exige ID exacto', () => {
    expect(filtrarSolicitudes(filas, { desde: '', hasta: '', usuario: 'JOSE CASA' }).map(v => v.idSolicitud)).toEqual([1])
    expect(filtrarSolicitudes(filas, { desde: '', hasta: '', usuario: '12' }).map(v => v.idSolicitud)).toEqual([1])
  })
  it('combina fecha y usuario y rechaza intervalos invertidos', () => {
    expect(filtrarSolicitudes(filas, { desde: '2026-11-20', hasta: '', usuario: '12' })).toEqual([])
    expect(filtrarSolicitudes(filas, { desde: '2026-11-20', hasta: '2026-11-19', usuario: '' })).toEqual([])
  })
  it('sin filtros conserva los datos y no requiere nuevas consultas', () => {
    expect(filtrarSolicitudes(filas, { desde: '', hasta: '', usuario: '' })).toEqual(filas)
  })
})
