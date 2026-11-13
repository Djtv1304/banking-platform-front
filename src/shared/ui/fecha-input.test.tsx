import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FechaInput } from '@/shared/ui/fecha-input'

describe('Presentación accesible de una fecha histórica', () => {
  it('agrupa campos rotulados y meses españoles, sin calendario dependiente del navegador', () => {
    const html = renderToStaticMarkup(<FechaInput id="constitucion" label="Fecha de constitución" value="2000-01-15" onChange={() => {}} onBlur={() => {}} required />)
    expect(html).toContain('<legend')
    expect(html).toContain('Fecha de constitución')
    expect(html).toContain('Día')
    expect(html).toContain('Año')
    expect(html).toContain('01 · Enero')
    expect(html).toContain('value="15"')
    expect(html).toContain('value="2000"')
    expect(html).toContain('inputMode="numeric"')
    expect(html).not.toContain('type="date"')
    expect(html).not.toContain('mm/dd')
  })
  it('asocia los errores y la indicación de formato con los controles', () => {
    const html = renderToStaticMarkup(<FechaInput id="constitucion" label="Fecha de constitución" value="" onChange={() => {}} onBlur={() => {}} invalid errorId="constitucion-error" />)
    expect(html).toContain('aria-describedby="constitucion-formato constitucion-error"')
    expect(html).toContain('aria-invalid="true"')
  })
  it('mantiene el autocompletado de cumpleaños en cada parte de la fecha de nacimiento', () => {
    const html = renderToStaticMarkup(<FechaInput id="nacimiento" label="Fecha de nacimiento" value="2000-02-29" onChange={() => {}} onBlur={() => {}} autoComplete="bday" />)
    for (const campo of ['bday-day', 'bday-month', 'bday-year']) {
      expect(html).toContain(`autoComplete="${campo}"`)
    }
  })
})
