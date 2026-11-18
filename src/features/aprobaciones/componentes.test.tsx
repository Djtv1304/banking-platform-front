import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { ComparadorCambios } from '@/shared/ui/comparador-cambios'
import { AvisoRequiereAprobacion } from '@/shared/ui/aviso-requiere-aprobacion'
import { LineaDeTiempo } from '@/shared/ui/linea-de-tiempo'

describe('componentes reutilizables de aprobaciones', () => {
  it('ordena los campos alfabeticamente para la lectura del usuario', () => {
    const html = renderToStaticMarkup(<ComparadorCambios antes={{ Zeta: 1, alfabeta: 2 }} despues={{ Zeta: 1, alfabeta: 2 }} />)
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
