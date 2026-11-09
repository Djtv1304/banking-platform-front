import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { EstadoCatalogo } from '@/features/clientes/components/EstadoCatalogo'

// El barril de UI también exporta el tema, que lee window al importarse.
// Este componente no lo utiliza: aislamos esa dependencia en el entorno Node.
vi.mock('@/shared/ui/theme-toggle', () => ({ ThemeToggle: () => null }))

const base = { data: [] as unknown[], isFetching: false, isError: false, refetch: vi.fn().mockResolvedValue(undefined) }
const renderizar = (consulta: typeof base) => renderToStaticMarkup(createElement(EstadoCatalogo, { id: 'estado-catalogo', nombre: 'países', consulta }))

describe('estados accesibles de un catálogo', () => {
  it('anuncia carga antes de ofrecer una lista vacía o repetir un error', () => {
    const html = renderizar({ ...base, isFetching: true, isError: true })
    expect(html).toContain('role="status"')
    expect(html).toContain('Cargando países')
    expect(html).not.toContain('No hay')
    expect(html).not.toContain('role="alert"')
  })

  it('muestra el fallo y un botón de reintento que no envía el formulario', () => {
    const html = renderizar({ ...base, isError: true })
    expect(html).toContain('role="alert"')
    expect(html).toContain('No pudimos cargar países')
    expect(html).toContain('aria-label="Reintentar países"')
    expect(html).toContain('type="button"')
    expect(html).not.toContain('No hay')
  })

  it('distingue un catálogo vacío de un error', () => {
    const html = renderizar(base)
    expect(html).toContain('No hay países disponibles')
    expect(html).toContain('role="status"')
    expect(html).not.toContain('<button')
  })

  it('no anuncia lista vacía ni carga inicial si ya hay datos cacheados', () => {
    const html = renderizar({ ...base, data: [{}], isFetching: true })
    expect(html).toContain('Catálogo de países cargado')
    expect(html).not.toContain('Cargando')
    expect(html).not.toContain('No hay')
  })
})
