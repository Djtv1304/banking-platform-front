import { Fragment, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, LoaderCircle, Search, ShieldCheck } from 'lucide-react'

import { cn } from '@/shared/lib'
import { Aviso, Button, Cargando, Input, Paginacion } from '@/shared/ui'
import { mensajeErrorBoveda } from '@/features/boveda/api/bovedas.api'
import { ESTADOS_ARQUEO, TIPOS_ARQUEO, type Arqueo } from '@/features/boveda/api/bovedas.contract'
import { Campo } from '@/features/boveda/components/Campo'
import { EstadoBadge } from '@/features/boveda/components/EstadoBadge'
import { UsuarioOperacion } from '@/features/boveda/components/UsuarioOperacion'
import { useArqueosBoveda } from '@/features/boveda/hooks/useBovedas'
import { campoClassName, selectClassName } from '@/features/boveda/lib/campos'
import {
  armarParametrosArqueos,
  FILTROS_ARQUEOS_VACIOS,
  filtrosArqueosSchema,
  hayFiltrosArqueos,
  resumenPaginacion,
  totalPaginas,
  type FiltrosArqueos,
} from '@/features/boveda/lib/filtros'
import { formatearFechaHora, formatearMonto } from '@/features/boveda/lib/formato'
import { arqueoPendiente, etiquetaEstadoArqueo, montoArqueo, resultadoArqueo } from '@/features/boveda/lib/operaciones'
import type { TonoEstado } from '@/features/boveda/lib/solicitudes'

const TONO_ARQUEO: Record<string, TonoEstado> = { REGISTRADO: 'pendiente', APROBADO: 'exito', ANULADO: 'neutro' }
const tonoArqueo = (estado: string) => TONO_ARQUEO[estado.trim().toUpperCase()] ?? 'neutro'

interface ArqueosBovedaProps {
  idBoveda: number
  /** Muestra «Aprobar» en los arqueos pendientes (BOV-06) */
  puedeAprobar: boolean
  onAprobar: (arqueo: Arqueo) => void
}

/** BOV-07 · Historial de arqueos con filtros; los pendientes se aprueban desde su fila */
export function ArqueosBoveda({ idBoveda, puedeAprobar, onAprobar }: ArqueosBovedaProps) {
  const [filtros, setFiltros] = useState<FiltrosArqueos>(FILTROS_ARQUEOS_VACIOS)
  const [page, setPage] = useState(1)
  const arqueos = useArqueosBoveda(idBoveda, armarParametrosArqueos(filtros, page), true)
  const aplicados = hayFiltrosArqueos(filtros)
  const mensajeError = arqueos.isError ? mensajeErrorBoveda(arqueos.error, 'consultar los arqueos de bóveda') : null

  const consultar = (nuevos: FiltrosArqueos) => {
    setFiltros(nuevos)
    setPage(1)
  }

  const resultado = (() => {
    if (arqueos.isError && !arqueos.data) return <Aviso tono="error">{mensajeError}</Aviso>
    if (arqueos.isPending) return <Cargando texto="Consultando los arqueos…" />
    if (arqueos.data.items.length === 0) {
      return (
        <Aviso>
          {aplicados
            ? 'Ningún arqueo coincide con los filtros. Prueba con otros valores o usa «Limpiar».'
            : 'Esta bóveda todavía no tiene arqueos. Aparecerán aquí en cuanto se registre el primero.'}
        </Aviso>
      )
    }
    const { items, total, pageSize } = arqueos.data
    return (
      <div className="flex flex-col gap-4">
        {mensajeError && <Aviso tono="error">{mensajeError}</Aviso>}
        <TablaArqueos arqueos={items} ocupado={arqueos.isFetching} puedeAprobar={puedeAprobar} onAprobar={onAprobar} />
        <Paginacion
          resumen={resumenPaginacion(page, total, pageSize, ['arqueo', 'arqueos'])}
          page={page}
          totalPaginas={totalPaginas(total, pageSize)}
          ocupado={arqueos.isFetching}
          onCambiar={setPage}
        />
      </div>
    )
  })()

  return (
    <div className="flex flex-col gap-6">
      <Filtros consultando={arqueos.isFetching} aplicados={aplicados} onConsultar={consultar} />
      {resultado}
    </div>
  )
}

function Filtros({ consultando, aplicados, onConsultar }: { consultando: boolean; aplicados: boolean; onConsultar: (filtros: FiltrosArqueos) => void }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FiltrosArqueos>({ resolver: zodResolver(filtrosArqueosSchema), defaultValues: FILTROS_ARQUEOS_VACIOS })
  const errorDesde = errors.desde?.message
  const errorHasta = errors.hasta?.message

  const limpiar = () => {
    reset(FILTROS_ARQUEOS_VACIOS)
    onConsultar(FILTROS_ARQUEOS_VACIOS)
  }

  return (
    <form
      onSubmit={handleSubmit(onConsultar)}
      noValidate
      aria-label="Filtros de arqueos"
      className="grid items-start gap-5 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
    >
      <Campo id="arq-estado" label="Estado">
        <select id="arq-estado" className={selectClassName} {...register('estado')}>
          <option value="">Todos</option>
          {ESTADOS_ARQUEO.map((estado) => (
            <option key={estado} value={estado}>
              {etiquetaEstadoArqueo(estado)}
            </option>
          ))}
        </select>
      </Campo>
      <Campo id="arq-tipo" label="Tipo">
        <select id="arq-tipo" className={selectClassName} {...register('tipoArqueo')}>
          <option value="">Todos</option>
          {TIPOS_ARQUEO.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>
      </Campo>
      <Campo id="arq-desde" label="Desde" error={errorDesde}>
        <Input
          id="arq-desde"
          type="date"
          className={campoClassName}
          aria-invalid={!!errorDesde}
          aria-describedby={errorDesde ? 'arq-desde-error' : undefined}
          {...register('desde')}
        />
      </Campo>
      <Campo id="arq-hasta" label="Hasta" error={errorHasta}>
        <Input
          id="arq-hasta"
          type="date"
          className={campoClassName}
          aria-invalid={!!errorHasta}
          aria-describedby={errorHasta ? 'arq-hasta-error' : undefined}
          {...register('hasta')}
        />
      </Campo>
      <div className="flex gap-3 sm:col-span-2 sm:justify-end xl:col-span-1 xl:mt-[32px]">
        {aplicados && (
          <Button type="button" variant="outline" disabled={consultando} onClick={limpiar} className="h-[52px] rounded-xl px-5 text-base">
            Limpiar
          </Button>
        )}
        <Button type="submit" disabled={consultando} className="h-[52px] rounded-xl px-6 text-base font-semibold">
          {consultando ? <LoaderCircle className="animate-spin" /> : <Search />}
          Consultar
        </Button>
      </div>
    </form>
  )
}

interface TablaArqueosProps {
  arqueos: Arqueo[]
  ocupado: boolean
  puedeAprobar: boolean
  onAprobar: (arqueo: Arqueo) => void
}

function TablaArqueos({ arqueos, ocupado, puedeAprobar, onAprobar }: TablaArqueosProps) {
  const [abierto, setAbierto] = useState<number | null>(null)

  return (
    <div className="relative overflow-x-auto">
      <table className={cn('w-full min-w-[820px] text-left text-sm transition-opacity', ocupado && 'opacity-60')}>
        <caption className="sr-only">Arqueos de la bóveda. Cada fila se puede desplegar para ver su detalle.</caption>
        <thead className="border-b border-border text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-3 font-medium">Fecha</th>
            <th scope="col" className="px-3 py-3 font-medium">Arqueo</th>
            <th scope="col" className="px-3 py-3 text-right font-medium">Sistema</th>
            <th scope="col" className="px-3 py-3 text-right font-medium">Contado</th>
            <th scope="col" className="px-3 py-3 text-right font-medium">Diferencia</th>
            <th scope="col" className="px-3 py-3 font-medium">Estado</th>
            <th scope="col" className="px-3 py-3">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {arqueos.map((arqueo) => {
            const expandido = abierto === arqueo.idArqueoBoveda
            const resultado = resultadoArqueo(arqueo)
            const idDetalle = `arqueo-${arqueo.idArqueoBoveda}`
            return (
              <Fragment key={arqueo.idArqueoBoveda}>
                <tr className={cn('transition-colors hover:bg-muted/60', expandido ? 'bg-muted/60' : 'border-b border-border')}>
                  <td className="px-3 py-3.5 align-top whitespace-nowrap text-heading tabular-nums">{formatearFechaHora(arqueo.fechaHoraArqueo)}</td>
                  <td className="px-3 py-3.5 align-top">
                    <span className="flex flex-col gap-0.5">
                      <span className="font-medium text-heading">N.º {arqueo.idArqueoBoveda}</span>
                      <span className="text-muted-foreground">{arqueo.tipoArqueo}</span>
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-right align-top whitespace-nowrap text-heading tabular-nums">{montoArqueo(arqueo.saldoTeorico)}</td>
                  <td className="px-3 py-3.5 text-right align-top whitespace-nowrap text-heading tabular-nums">{montoArqueo(arqueo.saldoFisico)}</td>
                  <td
                    className={cn(
                      'px-3 py-3.5 text-right align-top font-semibold whitespace-nowrap tabular-nums',
                      resultado === 'cuadra' || resultado === 'sin-dato' ? 'text-muted-foreground' : resultado === 'faltante' ? 'text-destructive' : 'text-heading',
                    )}
                  >
                    {resultado === 'sin-dato' ? (
                      <span title="El arqueo no guardó la diferencia">—</span>
                    ) : resultado === 'cuadra' ? (
                      'Cuadra'
                    ) : (
                      `${resultado === 'faltante' ? '−' : '+'}${formatearMonto(Math.abs(arqueo.diferencia ?? 0))}`
                    )}
                  </td>
                  <td className="px-3 py-3.5 align-top">
                    <EstadoBadge tono={tonoArqueo(arqueo.estado)}>{etiquetaEstadoArqueo(arqueo.estado)}</EstadoBadge>
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <div className="flex items-center justify-end gap-1">
                      {puedeAprobar && arqueoPendiente(arqueo) && (
                        <Button size="sm" variant="outline" onClick={() => onAprobar(arqueo)} className="rounded-lg font-semibold">
                          <ShieldCheck />
                          Aprobar
                        </Button>
                      )}
                      <button
                        type="button"
                        aria-expanded={expandido}
                        aria-controls={idDetalle}
                        aria-label={`${expandido ? 'Ocultar' : 'Ver'} detalle del arqueo ${arqueo.idArqueoBoveda}`}
                        onClick={() => setAbierto(expandido ? null : arqueo.idArqueoBoveda)}
                        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <ChevronDown className={cn('size-4 transition-transform', expandido && 'rotate-180')} />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandido && (
                  <tr id={idDetalle} className="border-b border-border bg-muted/60">
                    <td colSpan={7} className="px-3 pt-1 pb-5">
                      <DetalleArqueo arqueo={arqueo} />
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

function DetalleArqueo({ arqueo }: { arqueo: Arqueo }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
      {arqueo.observaciones && <p className="text-sm text-foreground">«{arqueo.observaciones}»</p>}
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
        <Dato label="Contó">
          <UsuarioOperacion idUsuario={arqueo.idUsuarioArqueador} />
        </Dato>
        <Dato label="Testigo">
          <UsuarioOperacion idUsuario={arqueo.idUsuarioTestigo} />
        </Dato>
        <Dato label="Aprobado por">
          {arqueo.idUsuarioAprobador == null ? <span className="font-normal text-muted-foreground">Sin aprobar</span> : <UsuarioOperacion idUsuario={arqueo.idUsuarioAprobador} />}
        </Dato>
        <Dato label="Fecha de aprobación">
          {arqueo.fechaHoraAprobacion ? formatearFechaHora(arqueo.fechaHoraAprobacion) : <span className="font-normal text-muted-foreground">—</span>}
        </Dato>
        {arqueo.idsMovimientosAjuste.length > 0 && (
          <Dato label="Movimientos de ajuste" className="sm:col-span-2 lg:col-span-4">
            {arqueo.idsMovimientosAjuste.map((id) => `N.º ${id}`).join(', ')}
          </Dato>
        )}
      </dl>
    </div>
  )
}

function Dato({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5', className)}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium text-heading tabular-nums">{children}</dd>
    </div>
  )
}
