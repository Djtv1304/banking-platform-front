import { useState } from 'react'
import { Link } from 'react-router'

import { toApiError } from '@/shared/api'
import { Aviso, Cargando, Paginacion } from '@/shared/ui'
import type { TarjetaResumen } from '@/features/tarjetas/api/tarjetas.contract'
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
        <Paginacion
          resumen={resumenPaginacion(page, total)}
          page={page}
          totalPaginas={totalPaginas(total)}
          ocupado={tarjetas.isFetching}
          onCambiar={setPage}
        />
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
            // Toda la fila abre el detalle: el enlace del número la cubre con su ::after
            <tr key={tarjeta.idTarjeta} className="relative border-b border-border transition-colors hover:bg-muted/60">
              <td className="px-3 py-3">
                <Link
                  to={`/tarjetas/${tarjeta.idTarjeta}`}
                  className="font-semibold text-link tabular-nums outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
                >
                  {tarjeta.numeroEnmascarado}
                </Link>
              </td>
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
