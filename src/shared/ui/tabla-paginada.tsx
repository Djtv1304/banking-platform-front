import { useId, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Download } from 'lucide-react'

import { aCsv, cn, descargarCsv } from '@/shared/lib'
import { Button } from '@/shared/ui/button'
import { EstadoPantalla } from '@/shared/ui/estado-pantalla'
import { Paginacion } from '@/shared/ui/paginacion'

export interface ColumnaTabla<T> {
  /** Identificador de la columna; es el `campo` que `onOrdenar` entrega al servidor */
  id: string
  titulo: string
  celda: (fila: T) => ReactNode
  /** Muestra el botón de orden en la cabecera (el servidor debe admitir ese campo) */
  ordenable?: boolean
  derecha?: boolean
  /** Valor de la columna en el CSV; sin él, la columna no se exporta */
  csv?: (fila: T) => string | number | null | undefined
}

export interface OrdenTabla {
  campo: string
  direccion: 'asc' | 'desc'
}

export interface PaginacionTabla {
  resumen: string
  page: number
  totalPaginas: number
  ocupado: boolean
  onCambiar: (page: number) => void
}

export interface EstadoTabla {
  cargando?: boolean
  error?: unknown
  reintentar?: () => void
  vacio?: { titulo: string; descripcion?: string }
}

export interface TablaPaginadaProps<T> {
  /** Nombre accesible de la tabla (aria-label) */
  etiqueta: string
  columnas: readonly ColumnaTabla<T>[]
  filas: readonly T[]
  claveFila: (fila: T) => string | number
  /** Orden vigente; lo aplica el servidor, la tabla sólo lo muestra */
  orden?: OrdenTabla
  /** Se llama con el `id` de la columna pulsada; quien usa la tabla decide la dirección y vuelve a consultar */
  onOrdenar?: (campo: string) => void
  paginacion?: PaginacionTabla
  /** Bloque de filtros; se pinta encima y sigue visible en carga, vacío y error */
  filtros?: ReactNode
  /** Muestra «Exportar CSV» con las filas visibles de esta página */
  exportar?: { nombreArchivo: string }
  estado?: EstadoTabla
  /** Ancho mínimo de la tabla antes de desplazarse en horizontal (clase de Tailwind) */
  anchoMinimo?: string
}

const FOCO = 'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none'

function textoOrden(activa: boolean, direccion: OrdenTabla['direccion'] | undefined) {
  if (!activa) return ', ordenar'
  return `, ordenado ${direccion === 'asc' ? 'de menor a mayor' : 'de mayor a menor'}`
}

/**
 * Tabla con orden, filtros, paginación y exportación CSV (E0-07). El orden y la paginación son del servidor: la tabla
 * sólo pinta lo que recibe y avisa con `onOrdenar` y `paginacion.onCambiar`. Si hay error, carga inicial o lista vacía,
 * muestra `EstadoPantalla` en lugar de la tabla y deja visibles los filtros.
 */
export function TablaPaginada<T>({
  etiqueta,
  columnas,
  filas,
  claveFila,
  orden,
  onOrdenar,
  paginacion,
  filtros,
  exportar,
  estado,
  anchoMinimo = 'min-w-[720px]',
}: TablaPaginadaProps<T>) {
  const idAyudaCsv = useId()
  const hayError = estado?.error !== undefined && estado.error !== null
  const cargandoSinFilas = Boolean(estado?.cargando) && filas.length === 0
  const vacio = !hayError && !cargandoSinFilas && filas.length === 0

  function exportarCsv() {
    if (!exportar || filas.length === 0) return
    const columnasCsv = columnas.flatMap((columna) =>
      columna.csv ? [{ titulo: columna.titulo, valor: columna.csv }] : [],
    )
    descargarCsv(exportar.nombreArchivo, aCsv(columnasCsv, filas))
  }

  let sustituto: ReactNode = null
  if (hayError) {
    sustituto = <EstadoPantalla estado="error" error={estado?.error} reintentar={estado?.reintentar} />
  } else if (cargandoSinFilas) {
    sustituto = <EstadoPantalla estado="cargando" />
  } else if (vacio) {
    sustituto = (
      <EstadoPantalla estado="vacio" titulo={estado?.vacio?.titulo} descripcion={estado?.vacio?.descripcion} />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {(filtros || exportar) && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          {filtros && <div className="min-w-0 flex-1">{filtros}</div>}
          {exportar && (
            <div className="flex flex-col items-end gap-1">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="rounded-lg px-4"
                disabled={filas.length === 0}
                aria-describedby={idAyudaCsv}
                onClick={exportarCsv}
              >
                <Download aria-hidden="true" />
                Exportar CSV
              </Button>
              <span id={idAyudaCsv} className="text-xs text-muted-foreground">
                Exporta las filas visibles de esta página.
              </span>
            </div>
          )}
        </div>
      )}

      {sustituto ?? (
        <div className="overflow-x-auto" aria-busy={estado?.cargando ? true : undefined}>
          <table aria-label={etiqueta} className={cn('w-full text-left text-sm', anchoMinimo)}>
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                {columnas.map(({ id, titulo, ordenable, derecha }) => {
                  const activa = ordenable === true && orden?.campo === id
                  return (
                    <th
                      key={id}
                      scope="col"
                      aria-sort={activa ? (orden?.direccion === 'asc' ? 'ascending' : 'descending') : undefined}
                      className={cn('px-3 py-3 font-medium', derecha && 'text-right')}
                    >
                      {ordenable && onOrdenar ? (
                        <button
                          type="button"
                          onClick={() => onOrdenar(id)}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-md hover:text-heading',
                            FOCO,
                            activa && 'text-heading',
                          )}
                        >
                          {titulo}
                          {activa ? (
                            orden?.direccion === 'asc' ? (
                              <ArrowUp aria-hidden="true" className="size-3.5" />
                            ) : (
                              <ArrowDown aria-hidden="true" className="size-3.5" />
                            )
                          ) : (
                            <ArrowUpDown aria-hidden="true" className="size-3.5 opacity-50" />
                          )}
                          <span className="sr-only">{textoOrden(activa, orden?.direccion)}</span>
                        </button>
                      ) : (
                        titulo
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => (
                <tr key={claveFila(fila)} className="border-b border-border">
                  {columnas.map(({ id, celda, derecha }) => (
                    <td key={id} className={cn('px-3 py-3 text-heading', derecha && 'text-right tabular-nums')}>
                      {celda(fila)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {paginacion && !hayError && !cargandoSinFilas && <Paginacion {...paginacion} />}
    </div>
  )
}
