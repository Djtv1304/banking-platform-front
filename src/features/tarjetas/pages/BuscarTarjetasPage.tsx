import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { Button } from '@/shared/ui'
import type { TarjetaResumen } from '@/features/tarjetas/api/tarjetas.contract'
import { Aviso, Cargando } from '@/features/tarjetas/components/Aviso'
import { EstadoTarjetaBadge } from '@/features/tarjetas/components/EstadoTarjetaBadge'
import { FiltrosTarjetas } from '@/features/tarjetas/components/FiltrosTarjetas'
import { useBuscarTarjetas } from '@/features/tarjetas/hooks/useConsultaTarjetas'
import {
  armarParametros,
  FILTROS_VACIOS,
  resumenPaginacion,
  totalPaginas,
  type FiltrosTarjetas as Filtros,
} from '@/features/tarjetas/lib/consulta'
import { etiquetaTipo, formatearDia, mensajeErrorTarjetas } from '@/features/tarjetas/lib/formato-consulta'

/** TAR-02 · Búsqueda de tarjetas; sin filtros lista la primera página */
export function BuscarTarjetasPage() {
  // Los filtros quedan en memoria, no en la URL
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS)
  const [page, setPage] = useState(1)
  const tarjetas = useBuscarTarjetas(armarParametros(filtros, page))

  const buscar = (nuevos: Filtros) => {
    setFiltros(nuevos)
    setPage(1)
  }

  const resultado = (() => {
    if (tarjetas.isError) return <Aviso tono="error">{mensajeErrorTarjetas(toApiError(tarjetas.error))}</Aviso>
    if (tarjetas.isPending) return <Cargando texto="Buscando tarjetas…" />
    if (tarjetas.data.items.length === 0) return <Aviso>No se encontraron tarjetas con esos filtros.</Aviso>

    const { items, total } = tarjetas.data
    return (
      <div className="flex flex-col gap-4">
        <TablaTarjetas tarjetas={items} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {resumenPaginacion(page, total)}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="lg"
              disabled={page <= 1 || tarjetas.isFetching}
              onClick={() => setPage((actual) => actual - 1)}
              className="rounded-lg px-4"
            >
              <ChevronLeft />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="lg"
              disabled={page >= totalPaginas(total) || tarjetas.isFetching}
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header>
        <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">Consultar tarjetas</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Busca tarjetas por cliente, cuenta o estado. Los filtros se combinan y comparan valores exactos.
        </p>
      </header>

      <section className="rounded-3xl border border-border bg-card p-6 not-dark:shadow-xl not-dark:shadow-brand-ink/5 sm:p-8">
        <FiltrosTarjetas buscando={tarjetas.isFetching} onBuscar={buscar} />
      </section>

      <section aria-label="Resultados" className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        {resultado}
      </section>
    </div>
  )
}

const ENCABEZADOS = ['Número', 'Nombre impreso', 'Tipo', 'Estado', 'Extensión', 'Emisión']

function TablaTarjetas({ tarjetas }: { tarjetas: TarjetaResumen[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-border text-muted-foreground">
          <tr>
            {ENCABEZADOS.map((titulo) => (
              <th key={titulo} scope="col" className="px-3 py-3 font-medium">
                {titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tarjetas.map((tarjeta) => (
            <tr key={tarjeta.idTarjeta} className="border-b border-border">
              <td className="px-3 py-3 font-semibold text-heading tabular-nums">{tarjeta.numeroEnmascarado}</td>
              <td className="px-3 py-3 text-heading">{tarjeta.nombreTarjeta}</td>
              <td className="px-3 py-3 text-heading">{etiquetaTipo(tarjeta.tipoTarjeta)}</td>
              <td className="px-3 py-3">
                <EstadoTarjetaBadge estado={tarjeta.estadoActual} />
              </td>
              <td className="px-3 py-3 text-heading">{tarjeta.esExtension ? 'Sí' : 'No'}</td>
              <td className="px-3 py-3 text-heading">{formatearDia(tarjeta.fechaEmision)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
