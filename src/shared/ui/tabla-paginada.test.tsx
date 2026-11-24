import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/shared/api'
import { TablaPaginada, type ColumnaTabla, type TablaPaginadaProps } from '@/shared/ui/tabla-paginada'

interface Cuenta {
  id: number
  numero: string
  saldo: number
}

const columnas: ColumnaTabla<Cuenta>[] = [
  { id: 'numero', titulo: 'Número', celda: (c) => c.numero, ordenable: true, csv: (c) => c.numero },
  { id: 'saldo', titulo: 'Saldo', celda: (c) => `$${c.saldo}`, ordenable: true, derecha: true, csv: (c) => c.saldo },
  { id: 'acciones', titulo: 'Acciones', celda: () => <button type="button">Ver</button> },
]

const filas: Cuenta[] = [
  { id: 1, numero: '001-A', saldo: 10 },
  { id: 2, numero: '002-B', saldo: 20 },
]

const html = (props: Partial<TablaPaginadaProps<Cuenta>> = {}) =>
  renderToStaticMarkup(
    <TablaPaginada etiqueta="Cuentas" columnas={columnas} filas={filas} claveFila={(c) => c.id} {...props} />,
  )

describe('TablaPaginada', () => {
  it('pinta la tabla con nombre accesible, cabeceras con scope y las filas', () => {
    const salida = html()
    expect(salida).toContain('<table aria-label="Cuentas"')
    expect(salida.match(/<th scope="col"/g)).toHaveLength(3)
    expect(salida).toContain('001-A')
    expect(salida).toContain('$20')
    expect(salida).toContain('min-w-[720px]')
  })

  it('permite cambiar el ancho mínimo', () => {
    expect(html({ anchoMinimo: 'min-w-[960px]' })).toContain('min-w-[960px]')
  })

  it('el botón de orden sólo aparece en columnas ordenables con onOrdenar', () => {
    const salida = html({ onOrdenar: vi.fn() })
    expect(salida.match(/<button type="button" class="inline-flex/g)).toHaveLength(2)
    expect(salida).toContain('focus-visible:ring-3')
    expect(html()).not.toContain('sr-only')
  })

  it('marca aria-sort en la columna activa, con icono y texto, y no en las demás', () => {
    const salida = html({ onOrdenar: vi.fn(), orden: { campo: 'saldo', direccion: 'desc' } })
    expect(salida.match(/aria-sort=/g)).toHaveLength(1)
    expect(salida).toContain('aria-sort="descending"')
    expect(salida).toContain(', ordenado de mayor a menor')
    expect(salida).toContain(', ordenar')
    expect(html({ onOrdenar: vi.fn(), orden: { campo: 'numero', direccion: 'asc' } })).toContain('aria-sort="ascending"')
  })

  it('no marca como activa una columna no ordenable aunque coincida el campo', () => {
    expect(html({ onOrdenar: vi.fn(), orden: { campo: 'acciones', direccion: 'asc' } })).not.toContain('aria-sort')
  })

  it('pinta los filtros encima de la tabla', () => {
    const salida = html({ filtros: <div>Mis filtros</div> })
    expect(salida.indexOf('Mis filtros')).toBeGreaterThan(-1)
    expect(salida.indexOf('Mis filtros')).toBeLessThan(salida.indexOf('<table'))
  })

  it('pinta la paginación debajo de la tabla', () => {
    const salida = html({
      paginacion: { resumen: 'Mostrando 1–2 de 2', page: 1, totalPaginas: 1, ocupado: false, onCambiar: vi.fn() },
    })
    expect(salida).toContain('Mostrando 1–2 de 2')
    expect(salida.indexOf('Mostrando')).toBeGreaterThan(salida.indexOf('</table>'))
  })

  it('exportar: botón habilitado con aclaración de que son las filas de la página', () => {
    const salida = html({ exportar: { nombreArchivo: 'cuentas' } })
    expect(salida).toContain('Exportar CSV')
    expect(salida).toContain('Exporta las filas visibles de esta página.')
    expect(salida).toContain('aria-describedby=')
    expect(salida).not.toContain('disabled=""')
  })

  it('exportar: botón deshabilitado sin filas', () => {
    const salida = html({ filas: [], exportar: { nombreArchivo: 'cuentas' } })
    expect(salida).toContain('Exportar CSV')
    expect(salida).toContain('disabled=""')
  })

  it('sin filas muestra el vacío indicado, conserva los filtros y no pinta la tabla', () => {
    const salida = html({
      filas: [],
      filtros: <div>Mis filtros</div>,
      estado: { vacio: { titulo: 'Sin cuentas', descripcion: 'Ajusta los filtros.' } },
    })
    expect(salida).toContain('Sin cuentas')
    expect(salida).toContain('Ajusta los filtros.')
    expect(salida).toContain('Mis filtros')
    expect(salida).not.toContain('<table')
  })

  it('sin filas ni textos propios usa el vacío por defecto', () => {
    expect(html({ filas: [] })).toContain('No hay nada para mostrar')
  })

  it('cargando sin filas muestra el estado de carga; con filas conserva la tabla', () => {
    const sin = html({ filas: [], estado: { cargando: true } })
    expect(sin).toContain('role="status"')
    expect(sin).not.toContain('<table')
    const con = html({ estado: { cargando: true } })
    expect(con).toContain('<table')
    expect(con).toContain('aria-busy="true"')
  })

  it('error: muestra el error con reintento en lugar de la tabla y sin paginación', () => {
    const error = new ApiError('No pudimos cargar las cuentas.', 500, 'error_interno')
    const salida = html({
      estado: { error, reintentar: vi.fn() },
      filtros: <div>Mis filtros</div>,
      paginacion: { resumen: 'Resumen', page: 1, totalPaginas: 1, ocupado: false, onCambiar: vi.fn() },
    })
    expect(salida).toContain('role="alert"')
    expect(salida).toContain('No pudimos cargar las cuentas.')
    expect(salida).toContain('Reintentar')
    expect(salida).toContain('Mis filtros')
    expect(salida).not.toContain('<table')
    expect(salida).not.toContain('Resumen')
  })
})
