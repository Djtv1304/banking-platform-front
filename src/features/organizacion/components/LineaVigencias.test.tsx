import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { LineaVigencias } from '@/features/organizacion/components/LineaVigencias'
import { HistorialSolicitudesProducto } from '@/features/organizacion/components/HistorialSolicitudesProducto'

vi.mock('@/shared/ui', async () => ({
  ...await import('@/shared/ui/aviso'),
  ...await import('@/shared/ui/button'),
}))

describe('tablas de vigencias para el usuario', () => {
  it('separa valores, unidades, fechas, estados y responsable sin redondear importes', () => {
    const html = renderToStaticMarkup(<LineaVigencias eventos={[{ id: 1, titulo: 'Condiciones del modelo', desde: '2026-11-19', hasta: null, estado: 'Vigente', responsable: 'Persona QA (12)', valores: { 'Apertura (USD)': '9007199254740991.99', 'Tasa anual (%)': '1.5000' } }]} />)
    for (const valor of ['<table', 'scope="col"', 'Apertura (USD)', '9007199254740991.99', '1.5000', 'Sin fecha final', 'Vigente', 'Persona QA (12)', 'overflow-x-auto']) expect(html).toContain(valor)
    expect(html).not.toContain('<ol')
  })
  it('conserva la accion de cancelar junto a la fila futura', () => {
    const html = renderToStaticMarkup(<LineaVigencias eventos={[{ id: 2, titulo: 'Ventanilla', desde: '2026-12-01', hasta: '2026-12-31', estado: 'Programado', responsable: 'Persona QA (12)', valores: { 'Diario (USD)': '1000' } }]} acciones={v => <button data-id={v.id}>Cancelar programacion</button>} />)
    expect(html).toContain('Acciones')
    expect(html).toContain('data-id="2"')
    expect(html).toContain('2026-12-31')
  })
  it('muestra quien solicito, fecha y estado y carga la comparacion solo al abrirla', () => {
    const html = renderToStaticMarkup(<QueryClientProvider client={new QueryClient()}><MemoryRouter><HistorialSolicitudesProducto solicitudes={[{ idSolicitud: 9, estado: 'Ejecutada', fecha: '2026-11-19T15:00:00Z', responsable: 'Persona QA (12)', clase: 'condiciones', accion: 'programar', datos: { montoAperturaMinimo: '50' } }]} /></MemoryRouter></QueryClientProvider>)
    for (const valor of ['Fecha de solicitud', 'Persona QA (12)', 'Estado de aprobacion', 'Ejecutada', 'Valor anterior / valor nuevo', 'Ver cambios', 'aria-expanded="false"', '/aprobaciones/9']) expect(html).toContain(valor)
    expect(html).not.toContain('montoAperturaMinimo')
  })
})
