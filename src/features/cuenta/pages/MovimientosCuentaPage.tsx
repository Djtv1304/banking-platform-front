import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { cn } from '@/shared/lib'
import { Button } from '@/shared/ui'
import type { Movimiento } from '@/features/cuenta/api/movimientos.contract'
import { Aviso, Cargando } from '@/features/cuenta/components/Aviso'
import { FiltrosMovimientos } from '@/features/cuenta/components/FiltrosMovimientos'
import { useCuenta } from '@/features/cuenta/hooks/useCuentas'
import { useMovimientos } from '@/features/cuenta/hooks/useMovimientos'
import { leerIdCuenta, resumenPaginacion, totalPaginas } from '@/features/cuenta/lib/filtros'
import {
  armarParametrosMovimientos,
  esCuentaInexistente,
  filaMovimiento,
  filtrosMovimientosIniciales,
  mensajeErrorMovimientos,
  type FiltrosMovimientos as Filtros,
} from '@/features/cuenta/lib/movimientos'

/** CTA-06 · Movimientos de una cuenta por rango de fechas contables y tipo de transacción */
export function MovimientosCuentaPage() {
  const { idCuenta: param } = useParams()
  // Un id no numérico o ≤ 0 no llega a la API: se trata igual que una cuenta inexistente
  const idCuenta = leerIdCuenta(param)
  // «Hoy» se fija al abrir la pantalla; los filtros quedan en memoria, no en la URL
  const [inicial] = useState(() => filtrosMovimientosIniciales())
  const [filtros, setFiltros] = useState<Filtros>(inicial)
  const [page, setPage] = useState(1)
  const movimientos = useMovimientos(idCuenta, armarParametrosMovimientos(filtros, page))
  // Solo para mostrar el número de la cuenta; si falla, la página sigue sin él
  const cuenta = useCuenta(idCuenta)

  const consultar = (nuevos: Filtros) => {
    setFiltros(nuevos)
    setPage(1)
  }

  const resultado = (() => {
    if (idCuenta === null || (movimientos.isError && esCuentaInexistente(toApiError(movimientos.error)))) {
      return <Aviso>No existe una cuenta con ese ID.</Aviso>
    }
    if (movimientos.isError) return <Aviso tono="error">{mensajeErrorMovimientos(toApiError(movimientos.error))}</Aviso>
    if (movimientos.isPending) return <Cargando texto="Consultando los movimientos…" />
    if (movimientos.data.items.length === 0) {
      return <Aviso>Esta cuenta no tiene movimientos en el rango y el tipo consultados.</Aviso>
    }

    const { items, total } = movimientos.data
    return (
      <div className="flex flex-col gap-4">
        <TablaMovimientos movimientos={items} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {resumenPaginacion(page, total, movimientos.data.pageSize)}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="lg"
              disabled={page <= 1 || movimientos.isFetching}
              onClick={() => setPage((actual) => actual - 1)}
              className="rounded-lg px-4"
            >
              <ChevronLeft />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="lg"
              disabled={page >= totalPaginas(total, movimientos.data.pageSize) || movimientos.isFetching}
              onClick={() => setPage((actual) => actual + 1)}
              className="rounded-lg px-4"
            >
              Siguiente
              <ChevronRight />
            </Button>
          </div>
        </div>
      </div>
    )
  })()

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <Button asChild variant="ghost" size="lg" className="-ml-2.5 w-fit rounded-lg text-muted-foreground">
        <Link to={idCuenta === null ? '/cuentas' : `/cuentas/${idCuenta}`}>
          <ArrowLeft />
          {idCuenta === null ? 'Volver a la búsqueda' : 'Volver a la cuenta'}
        </Link>
      </Button>

      <header>
        <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">Movimientos</h1>
        <p className="mt-2 text-base text-muted-foreground">
          {cuenta.data && <span className="font-medium text-heading">Cuenta {cuenta.data.numeroCuenta} · </span>}
          Débitos y créditos de la cuenta por fecha contable. Un reverso aparece como un movimiento más.
        </p>
      </header>

      <section className="rounded-3xl border border-border bg-card p-6 not-dark:shadow-xl not-dark:shadow-brand-ink/5 sm:p-8">
        <FiltrosMovimientos inicial={inicial} consultando={movimientos.isFetching} onConsultar={consultar} />
      </section>

      <section aria-label="Resultados" className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        {resultado}
      </section>
    </div>
  )
}

const encabezados = ['Fecha', 'Tipo', 'Movimiento', 'Monto', 'Saldo posterior', 'Comprobante']

function TablaMovimientos({ movimientos }: { movimientos: Movimiento[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-border text-muted-foreground">
          <tr>
            {encabezados.map((encabezado, i) => (
              <th key={encabezado} scope="col" className={cn('px-3 py-3 font-medium', i === 3 || i === 4 ? 'text-right' : '')}>
                {encabezado}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {movimientos.map((movimiento) => {
            const fila = filaMovimiento(movimiento)
            return (
              <tr key={fila.id} className="border-b border-border">
                <td className="px-3 py-3 whitespace-nowrap text-heading">{fila.fecha}</td>
                <td className="px-3 py-3 text-heading">{fila.tipo}</td>
                <td className={cn('px-3 py-3 font-medium', fila.esDebito ? 'text-destructive' : 'text-heading')}>
                  {fila.naturaleza}
                </td>
                <td className="px-3 py-3 text-right font-medium text-heading tabular-nums">{fila.monto}</td>
                <td className="px-3 py-3 text-right text-heading tabular-nums">{fila.saldoPosterior}</td>
                <td className="px-3 py-3 text-muted-foreground">{fila.comprobante}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
