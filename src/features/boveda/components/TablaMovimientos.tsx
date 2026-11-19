import { Fragment, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowDown, ArrowDownLeft, ArrowUp, ArrowUpRight, ChevronDown } from 'lucide-react'

import { cn } from '@/shared/lib'
import type { MovimientoBoveda } from '@/features/boveda/api/bovedas.contract'
import { UsuarioOperacion } from '@/features/boveda/components/UsuarioOperacion'
import type { DireccionOrden } from '@/features/boveda/lib/filtros'
import {
  etiquetaMovimiento,
  formatearFechaHora,
  formatearMonto,
  montoConSigno,
  piezasDelMovimiento,
} from '@/features/boveda/lib/formato'

interface TablaMovimientosProps {
  movimientos: MovimientoBoveda[]
  /** Valor de cada denominación por id, para leer el desglose */
  valores: ReadonlyMap<number, number>
  orden: DireccionOrden
  /** Atenúa la tabla y deshabilita el orden mientras llega la respuesta */
  ocupado: boolean
  onOrdenar: () => void
}

/** BOV-03 · Cada fila se despliega para ver saldos, desglose y quién registró y autorizó */
export function TablaMovimientos({ movimientos, valores, orden, ocupado, onOrdenar }: TablaMovimientosProps) {
  const [abierto, setAbierto] = useState<number | null>(null)
  const IconoOrden = orden === 'asc' ? ArrowUp : ArrowDown

  return (
    <div className="relative overflow-x-auto">
      <table className={cn('w-full min-w-[720px] text-left text-sm transition-opacity', ocupado && 'opacity-60')}>
        <caption className="sr-only">Movimientos de la bóveda. Cada fila se puede desplegar para ver su detalle.</caption>
        <thead className="border-b border-border text-muted-foreground">
          <tr>
            <th scope="col" aria-sort={orden === 'asc' ? 'ascending' : 'descending'} className="px-3 py-3 font-medium whitespace-nowrap">
              <button
                type="button"
                disabled={ocupado}
                onClick={onOrdenar}
                title={orden === 'asc' ? 'Más antiguos primero' : 'Más recientes primero'}
                className="-mx-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-heading outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait"
              >
                Fecha
                <IconoOrden aria-hidden className="size-3.5" />
              </button>
            </th>
            <th scope="col" className="px-3 py-3 font-medium">Movimiento</th>
            <th scope="col" className="px-3 py-3 text-right font-medium">Monto</th>
            <th scope="col" className="px-3 py-3 text-right font-medium whitespace-nowrap">Saldo posterior</th>
            <th scope="col" className="w-12 px-3 py-3">
              <span className="sr-only">Detalle</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {movimientos.map((movimiento) => {
            const ingreso = movimiento.naturaleza === 'I'
            const expandido = abierto === movimiento.idMovimiento
            const Icono = ingreso ? ArrowDownLeft : ArrowUpRight
            const idDetalle = `movimiento-${movimiento.idMovimiento}`
            return (
              <Fragment key={movimiento.idMovimiento}>
                <tr className={cn('transition-colors hover:bg-muted/60', expandido ? 'bg-muted/60' : 'border-b border-border')}>
                  <td className="px-3 py-3.5 align-top whitespace-nowrap text-heading tabular-nums">
                    {formatearFechaHora(movimiento.fechaMovimiento)}
                  </td>
                  <td className="px-3 py-3.5 align-top">
                    <div className="flex items-start gap-3">
                      <span
                        title={ingreso ? 'Ingreso' : 'Egreso'}
                        className={cn(
                          'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full',
                          ingreso ? 'bg-info/40 text-foreground' : 'bg-muted text-muted-foreground',
                        )}
                      >
                        <Icono aria-hidden className="size-3.5" />
                      </span>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="font-medium text-heading">{etiquetaMovimiento(movimiento.tipoMovimiento)}</span>
                        {movimiento.observaciones && (
                          <span className="line-clamp-1 max-w-md text-muted-foreground" title={movimiento.observaciones}>
                            {movimiento.observaciones}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className={cn('px-3 py-3.5 text-right align-top font-semibold whitespace-nowrap tabular-nums', ingreso ? 'text-heading' : 'text-muted-foreground')}>
                    <span className="sr-only">{ingreso ? 'Ingreso de ' : 'Egreso de '}</span>
                    {montoConSigno(movimiento)}
                  </td>
                  <td className="px-3 py-3.5 text-right align-top whitespace-nowrap text-heading tabular-nums">
                    {formatearMonto(movimiento.saldoPosterior)}
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <button
                      type="button"
                      aria-expanded={expandido}
                      aria-controls={idDetalle}
                      aria-label={`${expandido ? 'Ocultar' : 'Ver'} detalle del movimiento ${movimiento.idMovimiento}`}
                      onClick={() => setAbierto(expandido ? null : movimiento.idMovimiento)}
                      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <ChevronDown className={cn('size-4 transition-transform', expandido && 'rotate-180')} />
                    </button>
                  </td>
                </tr>
                {expandido && (
                  <tr id={idDetalle} className="border-b border-border bg-muted/60">
                    <td colSpan={5} className="px-3 pt-1 pb-5">
                      <DetalleMovimiento movimiento={movimiento} valores={valores} />
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function DetalleMovimiento({ movimiento, valores }: { movimiento: MovimientoBoveda; valores: ReadonlyMap<number, number> }) {
  const piezas = piezasDelMovimiento(movimiento.desglose, valores)
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
      {movimiento.observaciones && <p className="text-sm text-foreground">{movimiento.observaciones}</p>}

      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
        <Dato label="Saldo anterior">{formatearMonto(movimiento.saldoAnterior)}</Dato>
        <Dato label="Saldo posterior">{formatearMonto(movimiento.saldoPosterior)}</Dato>
        <Dato label="Registrado por">
          <UsuarioOperacion idUsuario={movimiento.idUsuarioMovimiento} />
        </Dato>
        <Dato label="Autorizado por">
          <UsuarioOperacion idUsuario={movimiento.autorizadoPor} />
        </Dato>
        <Dato label="N.º de movimiento">{movimiento.idMovimiento}</Dato>
        {movimiento.idBovedaContraparte != null && <Dato label="Bóveda contraparte">Bóveda {movimiento.idBovedaContraparte}</Dato>}
        {movimiento.idMovimientoRelacionado != null && <Dato label="Movimiento relacionado">N.º {movimiento.idMovimientoRelacionado}</Dato>}
        {movimiento.idSolicitudMovimiento != null && (
          <Dato label="Solicitud">
            <Link
              to={`/bovedas/solicitudes/${movimiento.idSolicitudMovimiento}`}
              className="rounded-sm font-semibold text-link underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              N.º {movimiento.idSolicitudMovimiento}
            </Link>
          </Dato>
        )}
        <Dato label="Asiento contable">
          {movimiento.idAsientoContable == null ? <span className="font-normal text-muted-foreground">Sin asiento</span> : `N.º ${movimiento.idAsientoContable}`}
        </Dato>
      </dl>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <p className="text-sm text-muted-foreground">Desglose del efectivo</p>
        {piezas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Este movimiento no registró denominaciones.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {piezas.map((pieza) => (
              <li key={pieza.idDenominacion} className="rounded-lg border border-border bg-field px-2.5 py-1 text-sm font-medium text-heading tabular-nums">
                {pieza.texto}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function Dato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium text-heading tabular-nums">{children}</dd>
    </div>
  )
}
