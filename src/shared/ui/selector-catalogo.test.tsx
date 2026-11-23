import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { SelectorCatalogo, type SelectorCatalogoProps } from '@/shared/ui/selector-catalogo'

interface Agencia {
  id: string
  nombre: string
}

const agencias: Agencia[] = [
  { id: 'a1', nombre: 'Matriz' },
  { id: 'a2', nombre: 'Norte' },
]

const html = (props: Partial<SelectorCatalogoProps<Agencia>> = {}) =>
  renderToStaticMarkup(
    <SelectorCatalogo<Agencia>
      etiqueta="Agencia"
      id="agencia"
      consulta={{ data: agencias, isLoading: false, isError: false }}
      opcion={(a) => ({ valor: a.id, etiqueta: a.nombre })}
      onCambiar={vi.fn()}
      {...props}
    />,
  )

describe('SelectorCatalogo', () => {
  it('con datos: label enlazado al selector, habilitado y con el marcador', () => {
    const salida = html()
    expect(salida).toContain('for="agencia"')
    expect(salida).toContain('id="agencia"')
    expect(salida).toContain('Agencia')
    expect(salida).toContain('Selecciona una opción')
    expect(salida).not.toContain('disabled=""')
    expect(salida).not.toContain('role="alert"')
  })

  it('cargando: deshabilitado, «Cargando…» y aria-busy', () => {
    const salida = html({ consulta: { data: [], isLoading: true, isError: false } })
    expect(salida).toContain('Cargando…')
    expect(salida).toContain('disabled=""')
    expect(salida).toContain('aria-busy="true"')
  })

  it('error con refetch: mensaje corto, botón Reintentar y enlace con aria-describedby', () => {
    const salida = html({ consulta: { data: [], isLoading: false, isError: true, refetch: vi.fn() } })
    expect(salida).toContain('role="alert"')
    expect(salida).toContain('No pudimos cargar las opciones')
    expect(salida).toContain('Reintentar')
    expect(salida).toContain('aria-describedby="agencia-catalogo-error"')
    expect(salida).toContain('disabled=""')
  })

  it('error sin refetch: sin botón Reintentar', () => {
    const salida = html({ consulta: { data: [], isLoading: false, isError: true } })
    expect(salida).toContain('No pudimos cargar las opciones')
    expect(salida).not.toContain('Reintentar')
  })

  it('sin datos: «Sin opciones» y deshabilitado', () => {
    const salida = html({ consulta: { data: [], isLoading: false, isError: false } })
    expect(salida).toContain('Sin opciones')
    expect(salida).toContain('disabled=""')
  })

  it('sin data (undefined) tampoco falla', () => {
    expect(html({ consulta: { isLoading: false, isError: false } })).toContain('Sin opciones')
  })

  it('inválido y con descripción del error: aria-invalid y aria-describedby', () => {
    const salida = html({ invalido: true, descripcionError: 'agencia-error' })
    expect(salida).toContain('aria-invalid="true"')
    expect(salida).toContain('aria-describedby="agencia-error"')
  })

  it('disabled propio deshabilita el selector aunque haya datos', () => {
    expect(html({ disabled: true })).toContain('disabled=""')
  })
})
