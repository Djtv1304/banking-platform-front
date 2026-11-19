import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { ComparadorCambios } from '@/shared/ui/comparador-cambios'
import { AvisoRequiereAprobacion } from '@/shared/ui/aviso-requiere-aprobacion'
import { LineaDeTiempo } from '@/shared/ui/linea-de-tiempo'

describe('componentes reutilizables de aprobaciones', () => {
  it('ordena los campos alfabeticamente para la lectura del usuario', () => {
    const html = renderToStaticMarkup(<ComparadorCambios antes={{ Zeta: 1, alfabeta: 2 }} despues={{ Zeta: 3, alfabeta: 4 }} />)
    expect(html.indexOf('alfabeta')).toBeLessThan(html.indexOf('Zeta'))
  })
  it('compara antes y despues sin depender solo del color y escapa texto', () => {
    const html = renderToStaticMarkup(<ComparadorCambios antes={{ valor: 10 }} despues={{ valor: '<script>fixture</script>' }} />)
    expect(html).toContain('Antes')
    expect(html).toContain('Despues')
    expect(html).toContain('Cambio')
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>fixture')
    expect(html).toContain('scope="col"')
  })
  it('oculta campos iguales y diferencias de formato decimal', () => {
    const html = renderToStaticMarkup(<ComparadorCambios antes={{ montoAperturaMinimo: '50.00', saldoMinimo: '10.00', periodicidadInteres: 'Mensual', tasaInteresAnual: '1.5000' }} despues={{ montoAperturaMinimo: '75', saldoMinimo: '10', periodicidadInteres: 'Mensual', tasaInteresAnual: '1.5' }} />)
    expect(html).toContain('Monto minimo de apertura (USD)')
    expect(html).toContain('50.00')
    expect(html).toContain('75')
    expect(html).not.toContain('Saldo minimo')
    expect(html).not.toContain('Periodicidad de interes')
    expect(html).not.toContain('Tasa anual')
  })
  it('no inventa diferencias al cambiar el orden de claves', () => {
    const html = renderToStaticMarkup(<ComparadorCambios antes={{ valor: [{ a: 1, b: 2 }] }} despues={{ valor: [{ b: 2, a: 1 }] }} />)
    expect(html).toContain('No hay valores modificados')
    expect(html).not.toContain('<table')
  })
  it('un 202 se anuncia como pendiente y enlaza a su solicitud', () => {
    const html = renderToStaticMarkup(<MemoryRouter><AvisoRequiereAprobacion idSolicitud={12} /></MemoryRouter>)
    expect(html).toContain('role="status"')
    expect(html).toContain('aún no se aplica')
    expect(html).toContain('/aprobaciones/12')
  })
  it('el historial incluye responsable y fecha semantica', () => {
    const html = renderToStaticMarkup(<LineaDeTiempo eventos={[{ clave: '1', etiqueta: 'Ejecutada', fecha: '2026-11-18T12:00:00Z', responsable: 'Responsable QA(12)', comentario: 'Cambio confirmado' }]} />)
    expect(html.toLowerCase()).toContain('datetime="2026-11-18t12:00:00z"')
    expect(html).toContain('Responsable QA(12)')
    expect(html).toContain('Cambio confirmado')
  })
})
