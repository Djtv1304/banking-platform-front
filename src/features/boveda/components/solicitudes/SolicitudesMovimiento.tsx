import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, ChevronRight, RefreshCw } from 'lucide-react'

import { cn } from '@/shared/lib'
import { Aviso, Button, Cargando, Paginacion } from '@/shared/ui'
import { useAgencias } from '@/features/catalogos'
import { mensajeErrorBoveda } from '@/features/boveda/api/bovedas.api'
import type { SolicitudMovimiento } from '@/features/boveda/api/bovedas.contract'
import { Campo } from '@/features/boveda/components/Campo'
import { EstadoBadge } from '@/features/boveda/components/EstadoBadge'
import { useBovedas, useSolicitudesMovimiento } from '@/features/boveda/hooks/useBovedas'
import { selectClassName } from '@/features/boveda/lib/campos'
import {
  armarParametrosSolicitudes,
  FILTROS_SOLICITUDES_INICIALES,
  resumenPaginacion,
  totalPaginas,
  type FiltrosSolicitudes,
} from '@/features/boveda/lib/filtros'
import { etiquetaMovimiento, formatearFechaHora, formatearMonto, nombreAgencia } from '@/features/boveda/lib/formato'
import {
  etiquetaEstadoSolicitud,
  nombreBoveda,
  OPCIONES_ESTADO_SOLICITUD,
  tonoEstadoSolicitud,
} from '@/features/boveda/lib/solicitudes'

const SIN_FILTROS = {}

/** Solicitudes visibles en la agencia operativa, con su estado de confirmación */
export function SolicitudesMovimiento({ puedeListarBovedas }: { puedeListarBovedas: boolean }) {
  const [filtros, setFiltros] = useState<FiltrosSolicitudes>(FILTROS_SOLICITUDES_INICIALES)
  const [page, setPage] = useState(1)
  const solicitudes = useSolicitudesMovimiento(armarParametrosSolicitudes(filtros, page), true)
  // Solo para nombrar las bóvedas; si falla, se muestran por ID
  const bovedas = useBovedas(SIN_FILTROS, puedeListarBovedas)
  const agencias = useAgencias()

  const filtrar = (cambio: Partial<FiltrosSolicitudes>) => {
    setFiltros((actual) => ({ ...actual, ...cambio }))
    setPage(1)
  }

  const resultado = (() => {
    if (solicitudes.isError && !solicitudes.data) {
      return (
        <Aviso tono="error">
          {mensajeErrorBoveda(solicitudes.error, 'consultar las solicitudes de movimiento')}
          <Button variant="outline" size="sm" disabled={solicitudes.isFetching} onClick={() => void solicitudes.refetch()} className="w-fit">
            <RefreshCw className={cn(solicitudes.isFetching && 'animate-spin')} />
            Reintentar
          </Button>
        </Aviso>
      )
    }
    if (solicitudes.isPending) return <Cargando texto="Consultando las solicitudes…" />
    if (solicitudes.data.items.length === 0) {
      return (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <p className="font-semibold text-heading">
            {filtros.estado === 'PENDIENTE' ? 'No hay solicitudes esperando aprobación' : 'No hay solicitudes con estos filtros'}
          </p>
          <p className="max-w-md text-sm text-muted-foreground">
            {filtros.estado === 'PENDIENTE'
              ? 'Cuando alguien solicite un movimiento desde el detalle de una bóveda, aparecerá aquí para revisarlo.'
              : 'Prueba con otro estado o con otra agencia.'}
          </p>
        </div>
      )
    }

    const { items, total, pageSize } = solicitudes.data
    return (
      <div className="flex flex-col gap-4">
        {solicitudes.isError && <Aviso tono="error">{mensajeErrorBoveda(solicitudes.error, 'consultar las solicitudes de movimiento')}</Aviso>}
        <ul className={cn('flex flex-col gap-3 transition-opacity', solicitudes.isFetching && 'opacity-60')}>
          {items.map((solicitud) => (
            <FilaSolicitud
              key={solicitud.idSolicitudMovimiento}
              solicitud={solicitud}
              origen={nombreBoveda(solicitud.idBoveda, bovedas.data ?? []) ?? ''}
              contraparte={nombreBoveda(solicitud.idBovedaContraparte, bovedas.data ?? [])}
              agencia={solicitud.idAgencia ? nombreAgencia(solicitud.idAgencia, agencias.data) : null}
            />
          ))}
        </ul>
        <Paginacion
          resumen={resumenPaginacion(page, total, pageSize, ['solicitud', 'solicitudes'])}
          page={page}
          totalPaginas={totalPaginas(total, pageSize)}
          ocupado={solicitudes.isFetching}
          onCambiar={setPage}
        />
      </div>
    )
  })()

  return (
    <section aria-label="Solicitudes de movimiento" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div role="radiogroup" aria-label="Estado de la solicitud" className="flex flex-wrap gap-2">
          {OPCIONES_ESTADO_SOLICITUD.map(({ valor, texto }) => {
            const activo = filtros.estado === valor
            return (
              <button
                key={texto}
                type="button"
                role="radio"
                aria-checked={activo}
                onClick={() => filtrar({ estado: valor })}
                className={cn(
                  'h-10 rounded-full border px-4 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                  activo ? 'border-brand-navy-deep bg-brand-navy-deep text-white' : 'border-border bg-card text-muted-foreground hover:text-foreground',
                )}
              >
                {texto}
              </button>
            )
          })}
        </div>
        <div className="flex w-full items-end gap-3 sm:w-auto">
          <div className="flex-1 sm:w-60 sm:flex-none">
            <Campo id="solicitudes-agencia" label="Agencia" error={agencias.isError ? 'No pudimos cargar las agencias.' : undefined}>
              <select
                id="solicitudes-agencia"
                value={filtros.idAgencia}
                onChange={(event) => filtrar({ idAgencia: event.target.value })}
                className={selectClassName}
              >
                <option value="">{agencias.isLoading ? 'Cargando agencias…' : 'Todas'}</option>
                {agencias.data.map((agencia) => (
                  <option key={agencia.idAgencia} value={agencia.idAgencia}>
                    {agencia.nombre !== agencia.idAgencia ? `${agencia.idAgencia} · ${agencia.nombre}` : agencia.idAgencia}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
          <Button
            variant="outline"
            size="icon"
            disabled={solicitudes.isFetching}
            onClick={() => void solicitudes.refetch()}
            aria-label="Actualizar solicitudes"
            title="Actualizar"
            className="size-[52px] shrink-0 rounded-xl"
          >
            <RefreshCw className={cn(solicitudes.isFetching && 'animate-spin')} />
          </Button>
        </div>
      </div>
      {resultado}
    </section>
  )
}

interface FilaSolicitudProps {
  solicitud: SolicitudMovimiento
  origen: string
  contraparte: string | null
  agencia: string | null
}

function FilaSolicitud({ solicitud, origen, contraparte, agencia }: FilaSolicitudProps) {
  return (
    <li>
      <Link
        to={`/bovedas/solicitudes/${solicitud.idSolicitudMovimiento}`}
        className="group grid items-center gap-x-6 gap-y-3 rounded-2xl border border-border bg-card px-5 py-4 outline-none transition-colors hover:border-ring/60 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
      >
        <span className="flex min-w-0 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-heading">{etiquetaMovimiento(solicitud.tipoMovimiento)}</span>
            <span className="text-sm text-muted-foreground">· N.º {solicitud.idSolicitudMovimiento}</span>
          </span>
          <span className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{origen}</span>
            {contraparte && (
              <>
                <ArrowRight aria-label="hacia" className="size-3.5" />
                <span className="font-medium text-foreground">{contraparte}</span>
              </>
            )}
            {agencia && <span>· {agencia}</span>}
          </span>
        </span>
        <span className="text-sm whitespace-nowrap text-muted-foreground tabular-nums">{formatearFechaHora(solicitud.fechaSolicitud)}</span>
        <span className="text-lg font-bold whitespace-nowrap text-heading tabular-nums">{formatearMonto(solicitud.monto)}</span>
        <span className="flex items-center justify-between gap-3 sm:justify-end">
          <EstadoBadge tono={tonoEstadoSolicitud(solicitud.estado)}>{etiquetaEstadoSolicitud(solicitud.estado)}</EstadoBadge>
          <ChevronRight aria-hidden className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </li>
  )
}
