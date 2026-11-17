import { useState, type FormEvent } from 'react'
import { Filter } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { Aviso, Button, Cargando, FechaInput, Paginacion } from '@/shared/ui'
import type { TarjetaHistorial } from '@/features/tarjetas/api/tarjetas.contract'
import { useHistorialTarjeta } from '@/features/tarjetas/hooks/useAccionesTarjeta'
import { formatearFechaHora, mensajeErrorAccionTarjeta } from '@/features/tarjetas/lib/acciones-tarjeta'
import { resumenPaginacion, totalPaginas } from '@/features/tarjetas/lib/consulta'
import {
  etiquetaEvento,
  etiquetaOrigenPin,
  etiquetaResultado,
  FILTRO_HISTORIAL_VACIO,
  type FiltroHistorial,
  filtroHistorialSchema,
} from '@/features/tarjetas/lib/historial-tarjeta'

type ErroresFiltro = Partial<Record<keyof FiltroHistorial, string>>

const fechaClassName = 'h-11 rounded-xl border-border bg-field px-3 text-base md:text-base dark:bg-field'

/** TAR-06 · Cambios de estado y de PIN, del más reciente al más antiguo (SUPERVISOR, AUDITOR y ADMIN) */
export function HistorialTarjeta({ idTarjeta }: { idTarjeta: number }) {
  const [borrador, setBorrador] = useState<FiltroHistorial>(FILTRO_HISTORIAL_VACIO)
  const [filtro, setFiltro] = useState<FiltroHistorial>(FILTRO_HISTORIAL_VACIO)
  const [errores, setErrores] = useState<ErroresFiltro>({})
  const [page, setPage] = useState(1)

  const filtrar = (event: FormEvent) => {
    event.preventDefault()
    const result = filtroHistorialSchema.safeParse(borrador)
    if (!result.success) {
      const siguientes: ErroresFiltro = {}
      for (const issue of result.error.issues) siguientes[issue.path[0] as keyof FiltroHistorial] ??= issue.message
      setErrores(siguientes)
      return
    }
    setErrores({})
    setFiltro(result.data)
    setPage(1)
  }

  const limpiar = () => {
    setBorrador(FILTRO_HISTORIAL_VACIO)
    setFiltro(FILTRO_HISTORIAL_VACIO)
    setErrores({})
    setPage(1)
  }

  const fecha = (campo: keyof FiltroHistorial, label: string) => {
    const id = `historial-${campo}`
    const error = errores[campo]
    return (
      <div className="flex flex-col gap-2">
        <FechaInput
          id={id}
          label={label}
          value={borrador[campo]}
          onChange={(valor) => setBorrador((actual) => ({ ...actual, [campo]: valor }))}
          onBlur={() => {}}
          invalid={!!error}
          errorId={error ? `${id}-error` : undefined}
          inputClassName={fechaClassName}
        />
        {error && (
          <p id={`${id}-error`} className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <section aria-labelledby="historial-tarjeta" className="flex flex-col gap-6 rounded-3xl border border-border bg-card p-6 sm:p-8">
      <header className="flex flex-col gap-1">
        <h2 id="historial-tarjeta" className="text-lg font-semibold text-heading">
          Historial
        </h2>
        <p className="text-sm text-muted-foreground">Cambios de estado y de PIN, del más reciente al más antiguo.</p>
      </header>

      <form onSubmit={filtrar} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 lg:grid-cols-2">
          {fecha('fechaDesde', 'Desde (opcional)')}
          {fecha('fechaHasta', 'Hasta (opcional)')}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" className="rounded-lg px-4 font-semibold">
            <Filter />
            Filtrar
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={limpiar} className="rounded-lg px-4">
            Limpiar
          </Button>
        </div>
      </form>

      <Resultados idTarjeta={idTarjeta} filtro={filtro} page={page} onCambiarPagina={setPage} />
    </section>
  )
}

interface ResultadosProps {
  idTarjeta: number
  filtro: FiltroHistorial
  page: number
  onCambiarPagina: (page: number) => void
}

function Resultados({ idTarjeta, filtro, page, onCambiarPagina }: ResultadosProps) {
  const historial = useHistorialTarjeta(idTarjeta, filtro, page)

  if (historial.isError) {
    return <Aviso tono="error">{mensajeErrorAccionTarjeta(toApiError(historial.error), 'historial')}</Aviso>
  }
  if (historial.isPending) return <Cargando texto="Cargando el historial…" />

  const { items, total } = historial.data
  if (total === 0) {
    const conFiltro = filtro.fechaDesde || filtro.fechaHasta
    return <Aviso>{conFiltro ? 'No hay cambios en esas fechas.' : 'Esta tarjeta todavía no tiene cambios registrados.'}</Aviso>
  }

  return (
    <div className="flex flex-col gap-4">
      <TablaHistorial items={items} />
      {totalPaginas(total) > 1 && (
        <Paginacion
          resumen={resumenPaginacion(page, total)}
          page={page}
          totalPaginas={totalPaginas(total)}
          ocupado={historial.isFetching}
          onCambiar={onCambiarPagina}
        />
      )}
    </div>
  )
}

const COLUMNAS = ['Fecha y hora', 'Evento', 'Estado', 'Motivo', 'Resultado', 'Origen del PIN', 'Realizado por']

export function TablaHistorial({ items }: { items: readonly TarjetaHistorial[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-left text-sm">
        <thead className="border-b border-border text-muted-foreground">
          <tr>
            {COLUMNAS.map((columna) => (
              <th key={columna} scope="col" className="px-3 py-3 font-medium">
                {columna}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((evento) => (
            <tr key={evento.idHistorial} className="border-b border-border align-top">
              <td className="px-3 py-3 whitespace-nowrap text-heading">{formatearFechaHora(evento.fechaCambio)}</td>
              <td className="px-3 py-3 text-heading">{etiquetaEvento(evento.tipoEvento)}</td>
              <td className="px-3 py-3 whitespace-nowrap">
                <CambioEstado anterior={evento.estadoAnterior} nuevo={evento.estadoNuevo} />
              </td>
              <td className="max-w-xs px-3 py-3 break-words text-heading">{evento.motivo ?? '—'}</td>
              <td className="px-3 py-3 text-heading">{etiquetaResultado(evento.resultado)}</td>
              <td className="px-3 py-3 text-heading">{etiquetaOrigenPin(evento.tipoEvento, evento.origen)}</td>
              <td className="px-3 py-3 text-heading tabular-nums">ID {evento.realizadoPor}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** «Activa → Bloqueada»; un evento sin estado (cambio de PIN) muestra «—» */
function CambioEstado({ anterior, nuevo }: { anterior?: string | null; nuevo?: string | null }) {
  if (!anterior && !nuevo) return <span className="text-muted-foreground">—</span>
  return (
    <>
      <span className="text-muted-foreground">{anterior ?? '—'}</span>
      <span aria-hidden="true"> → </span>
      <span className="sr-only"> a </span>
      <span className="font-medium text-heading">{nuevo ?? '—'}</span>
    </>
  )
}
