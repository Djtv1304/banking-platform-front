import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { detalleSchema } from '@/features/aprobaciones/api/aprobaciones.contract'
import { ResumenCambioProducto } from '@/features/organizacion/components/ResumenCambioProducto'
import { ComparadorCambios } from '@/shared/ui/comparador-cambios'

function render(propuesta: Record<string, unknown>, registros: unknown[] = []) {
  const solicitud = detalleSchema.parse({ idSolicitud: 1, codigoTransaccion: 'PRD-CONDICION', tipoObjetivo: 'SubProducto', idObjetivo: '1', idAgencia: null, estado: 'Pendiente', fechaSolicitud: '2026-11-18T12:00:00Z', solicitante: { sujeto: 'user_fixture', nombre: 'Persona QA', idInterno: 1 }, resolutor: null, fechaResolucion: null, comentario: null, codigoError: null, puedeAprobar: false, puedeRechazar: false, puedeCancelar: true, antes: { registros }, despues: { subproducto: { nombre: 'Ahorro Familiar', producto: 'Cuentas' }, propuesta }, eventos: [] })
  return renderToStaticMarkup(<QueryClientProvider client={new QueryClient()}><ResumenCambioProducto solicitud={solicitud} /></QueryClientProvider>)
}
describe('solicitudes legibles para el usuario', () => {
  it('explica donde y que cambia sin mostrar el plan interno', () => {
    const html = render({ clase: 'condiciones', accion: 'programar', datos: { vigenciaDesde: '2026-12-01', montoAperturaMinimo: '50', saldoMinimo: '10', tasaInteresAnual: '1.5' }, _previos: [{ secretoInterno: 'no visible' }] })
    expect(html).toContain('Cambiar las condiciones del modelo')
    expect(html).toContain('Ahorro Familiar')
    expect(html).toContain('Monto minimo de apertura (USD)')
    expect(html).toContain('El cambio aun no se aplica')
    expect(html).not.toContain('_previos')
    expect(html).not.toContain('secretoInterno')
  })
  it('explica cancelar una programacion futura conservando el anterior', () => {
    const html = render({ clase: 'cupos', accion: 'cancelar', inicio: '2026-12-01', _restaurar: [{ id: 1 }] })
    expect(html).toContain('Cancelar una programacion futura')
    expect(html).toContain('Se conservaran')
    expect(html).not.toContain('_restaurar')
  })
  it('describe restricciones con nombres comerciales y valores', () => {
    const html = render({ clase: 'restricciones', accion: 'programar', datos: { tipoRestriccion: 'MAXIMO_CUENTAS_CLIENTE', cantidad: 2, descripcion: 'Dos cuentas por cliente', vigenciaDesde: '2026-12-01' } })
    expect(html).toContain('maximo de cuentas por cliente')
    expect(html).toContain('Dos cuentas por cliente')
    expect(html).not.toContain('MAXIMO_CUENTAS_CLIENTE')
  })
  it('el comparador compartido presenta estructuras como datos, sin JSON', () => {
    const html = renderToStaticMarkup(<ComparadorCambios antes={{ valor: [] }} despues={{ valor: [{ nombre: 'Agencia QA', habilitada: true }], _previos: ['privado'] }} />)
    expect(html).toContain('Agencia QA')
    expect(html).toContain('Si')
    expect(html).not.toContain('&quot;nombre&quot;')
    expect(html).not.toContain('privado')
  })
  it('muestra solo el limite cambiado y omite los canales sin cambios', () => {
    const limite = { cupoDiarioMaximo: '1000', cupoMensualMaximo: '5000', montoMaxTransaccion: '100', maxTransaccionesDia: 10 }
    const previo = { EstadoCupo: 'A', VigenciaDesde: '2026-01-01', VigenciaHasta: null, CupoDiarioMaximo: '1000.00', CupoMensualMaximo: '5000.00', MontoMaxTransaccion: '100.00', MaxTransaccionesDia: 10 }
    const html = render({ clase: 'cupos', accion: 'programar', datos: { vigenciaDesde: '2026-12-01', cupos: [{ idCanal: 1, ...limite }, { idCanal: 2, ...limite, montoMaxTransaccion: '150' }] } }, [{ ...previo, IdCanal: 1 }, { ...previo, IdCanal: 2 }])
    expect(html).not.toContain('Canal 1')
    expect(html).toContain('Canal 2')
    expect(html).toContain('Maximo por transaccion (USD)')
    expect(html).not.toContain('Cupo diario (USD)')
    expect(html).not.toContain('Cupo mensual (USD)')
  })
})
