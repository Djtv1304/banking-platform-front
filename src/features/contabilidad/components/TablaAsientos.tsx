import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

import { cn } from '@/shared/lib'
import { Badge } from '@/shared/ui'
import type { Asiento, CampoOrdenAsiento } from '@/features/contabilidad/api/asientos.contract'
import { formatearSaldo } from '@/features/contabilidad/lib/cuenta-contable'
import {
  etiquetaEstadoAsiento,
  etiquetaOrigenAsiento,
  formatearFechaAsiento,
  tonoEstadoAsiento,
  type OrdenAsientos,
} from '@/features/contabilidad/lib/asientos'

interface Columna {
  titulo: string
  /** Campo de `sort` de CON-04; sin él la columna no se ordena (el backend no lo admite) */
  campo?: CampoOrdenAsiento
  derecha?: boolean
}

const COLUMNAS: Columna[] = [
  { titulo: 'Número', campo: 'numeroAsiento' },
  { titulo: 'Fecha', campo: 'fechaAsiento' },
  { titulo: 'Concepto' },
  { titulo: 'Origen', campo: 'origen' },
  { titulo: 'Agencia' },
  { titulo: 'Total débito', campo: 'totalDebito', derecha: true },
  { titulo: 'Total crédito', derecha: true },
  { titulo: 'Estado', campo: 'estado' },
]

interface TablaAsientosProps {
  asientos: Asiento[]
  orden: OrdenAsientos
  /** Nombre de la agencia por id; si falta, se muestra el id */
  agencias: ReadonlyMap<string, string>
  onOrdenar: (campo: CampoOrdenAsiento) => void
  onSeleccionar: (idAsiento: number) => void
}

export function TablaAsientos({ asientos, orden, agencias, onOrdenar, onSeleccionar }: TablaAsientosProps) {
  return (
    <div className="overflow-x-auto">
      <table aria-label="Asientos contables" className="w-full min-w-[960px] text-left text-sm">
        <thead className="border-b border-border text-muted-foreground">
          <tr>
            {COLUMNAS.map(({ titulo, campo, derecha }) => {
              const activa = campo !== undefined && orden.campo === campo
              return (
                <th
                  key={titulo}
                  scope="col"
                  aria-sort={activa ? (orden.direccion === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={cn('px-3 py-3 font-medium', derecha && 'text-right')}
                >
                  {campo ? (
                    <button
                      type="button"
                      onClick={() => onOrdenar(campo)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-md hover:text-heading focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                        activa && 'text-heading',
                      )}
                    >
                      {titulo}
                      {activa ? (
                        orden.direccion === 'asc' ? <ArrowUp aria-hidden="true" className="size-3.5" /> : <ArrowDown aria-hidden="true" className="size-3.5" />
                      ) : (
                        <ArrowUpDown aria-hidden="true" className="size-3.5 opacity-50" />
                      )}
                      <span className="sr-only">{activa ? `, ordenado ${orden.direccion === 'asc' ? 'de menor a mayor' : 'de mayor a menor'}` : ', ordenar'}</span>
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
          {asientos.map((asiento) => (
            <tr key={asiento.idAsientoContable} className="border-b border-border">
              <th scope="row" className="px-3 py-3 text-left font-medium whitespace-nowrap text-heading">
                <button
                  type="button"
                  onClick={() => onSeleccionar(asiento.idAsientoContable)}
                  aria-label={`Ver el asiento ${asiento.numeroAsiento}`}
                  className="rounded-md text-link underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {asiento.numeroAsiento}
                </button>
              </th>
              <td className="px-3 py-3 whitespace-nowrap text-heading">{formatearFechaAsiento(asiento.fechaAsiento)}</td>
              <td className="max-w-72 px-3 py-3 text-heading">
                <span className="line-clamp-2" title={asiento.concepto}>
                  {asiento.concepto}
                </span>
              </td>
              <td className="px-3 py-3 text-heading">{etiquetaOrigenAsiento(asiento.origen)}</td>
              <td className="px-3 py-3 whitespace-nowrap text-heading">{agencias.get(asiento.idAgencia) ?? asiento.idAgencia}</td>
              <td className="px-3 py-3 text-right text-heading tabular-nums">{formatearSaldo(asiento.totalDebito)}</td>
              <td className="px-3 py-3 text-right text-heading tabular-nums">{formatearSaldo(asiento.totalCredito)}</td>
              <td className="px-3 py-3">
                <div className="flex flex-col items-start gap-1">
                  <Badge variant={tonoEstadoAsiento(asiento.estado)}>{etiquetaEstadoAsiento(asiento.estado)}</Badge>
                  {asiento.idAsientoReversion !== null && (
                    <span className="text-xs text-muted-foreground">Revertido por otro asiento</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
