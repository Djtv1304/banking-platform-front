import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { EncabezadoEntidad } from '@/features/organizacion/components/EncabezadoEntidad'

// Renderiza el Badge real sin inicializar otros exports de UI que requieren navegador.
vi.mock('@/shared/ui', async () => ({ Badge: (await import('@/shared/ui/badge')).Badge }))

describe('Encabezado de la cooperativa', () => {
  it.each([['A', 'Activa'], ['I', 'Inactiva']] as const)('muestra la identidad y el estado %s sin controles de modificación', (estado, etiqueta) => {
    const html = renderToStaticMarkup(<EncabezadoEntidad entidad={{ razonSocial: 'Cooperativa de prueba', ruc: '1790000000001', estado }} />)
    expect(html).toContain('Cooperativa de prueba')
    expect(html).toContain('RUC 1790000000001')
    expect(html).toContain(etiqueta)
    expect(html).not.toContain('<button')
    expect(html).not.toContain('<select')
  })
  it('presenta la razón social como texto, sin interpretar HTML', () => {
    const html = renderToStaticMarkup(<EncabezadoEntidad entidad={{ razonSocial: '<script>alert(1)</script>', ruc: '1790000000001', estado: 'A' }} />)
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>')
  })
})
