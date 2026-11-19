import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { InsigniaEstado, type TonoInsignia } from '@/shared/ui/insignia-estado'

const CLASE_POR_TONO: Record<TonoInsignia, string> = {
  exito: 'bg-primary/15',
  advertencia: 'border-link/60',
  peligro: 'bg-destructive/10',
  info: 'bg-info/15',
  neutro: 'bg-muted',
}

describe('InsigniaEstado', () => {
  it.each(Object.entries(CLASE_POR_TONO) as [TonoInsignia, string][])('tono %s: texto visible, clase propia e icono oculto a lectores', (tono, clase) => {
    const salida = renderToStaticMarkup(<InsigniaEstado tono={tono}>Estado de prueba</InsigniaEstado>)
    expect(salida).toContain('Estado de prueba')
    expect(salida).toContain(clase)
    expect(salida).toContain(`data-tono="${tono}"`)
    expect(salida).toContain('<svg')
    expect(salida).toContain('aria-hidden="true"')
  })

  it('cada tono usa un icono distinto: el significado no depende del color', () => {
    const iconos = (Object.keys(CLASE_POR_TONO) as TonoInsignia[]).map((tono) =>
      /lucide-[a-z-]+/.exec(renderToStaticMarkup(<InsigniaEstado tono={tono}>x</InsigniaEstado>))?.[0],
    )
    expect(new Set(iconos).size).toBe(iconos.length)
  })

  it('acepta un icono propio y permite quitarlo con null', () => {
    const propio = renderToStaticMarkup(<InsigniaEstado tono="info" icono={<i data-propio />}>Hola</InsigniaEstado>)
    expect(propio).toContain('data-propio')
    expect(propio).not.toContain('<svg')
    expect(renderToStaticMarkup(<InsigniaEstado tono="info" icono={null}>Hola</InsigniaEstado>)).not.toContain('<svg')
  })
})
