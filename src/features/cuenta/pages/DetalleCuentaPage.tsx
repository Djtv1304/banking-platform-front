import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { ArrowLeft, Gauge, RefreshCw } from 'lucide-react'
import { Tabs } from 'radix-ui'

import { toApiError } from '@/shared/api'
import { cn } from '@/shared/lib'
import { Button, ErrorApi } from '@/shared/ui'
import { useAuthStore, usePuedeFuncion } from '@/features/auth'
import { agregarAutorizado, anularApertura, consultarAutorizados, consultarEventosCuenta, finalizarAutorizado, type RolAutorizado } from '@/features/cuenta/api/apertura.api'
import type { Cuenta } from '@/features/cuenta/api/cuentas.contract'
import { Aviso, Cargando } from '@/features/cuenta/components/Aviso'
import { CambioSubproductoDialog } from '@/features/cuenta/components/CambioSubproductoDialog'
import { EstadoCuentaBadge } from '@/features/cuenta/components/EstadoCuentaBadge'
import { useCuenta, useNombresCuenta, useSaldoCuenta } from '@/features/cuenta/hooks/useCuentas'
import { usePermisosCupos } from '@/features/cuenta/hooks/useCupos'
import { leerIdCuenta } from '@/features/cuenta/lib/filtros'
import { formatearFechaConsulta, formatearMonto } from '@/features/cuenta/lib/formato'
import { MovimientosCuenta } from '@/features/cuenta/pages/MovimientosCuentaPage'

const cardClassName = 'flex flex-col gap-6 rounded-3xl border border-border bg-card p-6 sm:p-8'
const tabClassName = 'rounded-lg border border-border px-4 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'

/** CTA-03 (datos) y CTA-04 (saldos) de una cuenta en cualquier estado */
export function DetalleCuentaPage() {
  const { idCuenta: param } = useParams()
  // Un id no numérico o ≤ 0 no llega a la API: se trata igual que una cuenta inexistente
  const idCuenta = leerIdCuenta(param)
  const cuenta = useCuenta(idCuenta)

  const contenido = (() => {
    if (idCuenta === null || (cuenta.isError && toApiError(cuenta.error).status === 404)) {
      return (
        <SinDetalle>
          <Aviso>No existe una cuenta con ese ID.</Aviso>
        </SinDetalle>
      )
    }
    if (cuenta.isError) {
      return (
        <SinDetalle>
          <ErrorApi error={cuenta.error} />
        </SinDetalle>
      )
    }
    if (cuenta.isPending) {
      return (
        <SinDetalle>
          <Cargando texto="Cargando la cuenta…" />
        </SinDetalle>
      )
    }
    return <DetalleCuenta cuenta={cuenta.data} />
  })()

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <Button asChild variant="ghost" size="lg" className="-ml-2.5 w-fit rounded-lg text-muted-foreground">
        <Link to="/cuentas">
          <ArrowLeft />
          Volver a la búsqueda
        </Link>
      </Button>
      {contenido}
    </div>
  )
}

/** Carga, error o cuenta inexistente: mismo título, sin datos */
function SinDetalle({ children }: { children: ReactNode }) {
  return (
    <>
      <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">Detalle de la cuenta</h1>
      {children}
    </>
  )
}

function DetalleCuenta({ cuenta }: { cuenta: Cuenta }) {
  const nombres = useNombresCuenta()
  const cupos = usePermisosCupos()
  const usuario = useAuthStore(state => state.user)
  const puedeAbrir = usePuedeFuncion('cuentas.abrir', !!usuario?.roles?.some(rol => rol === 'ASESOR' || rol === 'ADMIN'))
  const mismaAgencia = usuario?.idAgencia === cuenta.idAgencia
  const puedeCambiar = usePuedeFuncion('cuentas.subproducto', !!usuario?.roles?.includes('ASESOR'))

  return (
    <>
      {/* Encabezado: las acciones sobre la cuenta (A-03) irían a su derecha */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">
            Cuenta {cuenta.numeroCuenta}
          </h1>
          <EstadoCuentaBadge estado={cuenta.estado} />
        </div>
        <div className="flex flex-wrap gap-3">
          {puedeCambiar && mismaAgencia && !['PendienteDeposito', 'Anulada', 'CERRADA'].includes(cuenta.estado) && (
            <CambioSubproductoDialog key={cuenta.idCuenta} idCuenta={cuenta.idCuenta} />
          )}
          {cupos.ver && (
            <Button asChild variant="outline" size="lg" className="rounded-lg px-3">
              <Link to={`/cuentas/${cuenta.idCuenta}/cupos`}>
                <Gauge />
                Cupos por canal
              </Link>
            </Button>
          )}
        </div>
      </header>
      {cuenta.estado === 'PendienteDeposito' && puedeAbrir && usuario?.idAgencia === cuenta.idAgencia && (
        <AnulacionPendiente idCuenta={cuenta.idCuenta} />
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section aria-labelledby="datos-cuenta" className={cardClassName}>
          <h2 id="datos-cuenta" className="text-lg font-semibold text-heading">
            Datos de la cuenta
          </h2>
          <dl className="grid gap-5 sm:grid-cols-2">
            <Dato label="Número de cuenta">{cuenta.numeroCuenta}</Dato>
            <Dato label="Tipo">{cuenta.tipoCuenta}</Dato>
            <Dato label="Producto">{nombres.producto(cuenta.idProducto)}</Dato>
            <Dato label="Agencia">{nombres.agencia(cuenta.idAgencia)}</Dato>
            <Dato label="Estado">
              <EstadoCuentaBadge estado={cuenta.estado} />
            </Dato>
            <Dato label="Titular">{cuenta.nombreTitular ?? `Cliente ${cuenta.idCliente}`}</Dato>
            {cuenta.motivoEstado && <Dato label="Motivo del estado">{cuenta.motivoEstado}</Dato>}
          </dl>
        </section>

        <ResumenSaldos idCuenta={cuenta.idCuenta} cerrada={cuenta.estado === 'CERRADA'} />
      </div>
      <Tabs.Root key={cuenta.idCuenta} defaultValue="movimientos" className="flex flex-col gap-4">
        <Tabs.List aria-label="Detalle de cuenta" className="flex flex-wrap gap-2">
          <Tabs.Trigger value="movimientos" className={tabClassName}>Movimientos</Tabs.Trigger>
          {mismaAgencia && <Tabs.Trigger value="autorizados" className={tabClassName}>Autorizados</Tabs.Trigger>}
          {mismaAgencia && <Tabs.Trigger value="historial" className={tabClassName}>Historial</Tabs.Trigger>}
        </Tabs.List>
        <Tabs.Content value="movimientos"><MovimientosCuenta idCuenta={cuenta.idCuenta} /></Tabs.Content>
        {mismaAgencia && (
          <>
            <Tabs.Content value="autorizados">
              <AutorizadosCuenta idCuenta={cuenta.idCuenta} editable={puedeAbrir && !['Anulada', 'CERRADA'].includes(cuenta.estado)} />
            </Tabs.Content>
            <Tabs.Content value="historial"><HistorialCuenta idCuenta={cuenta.idCuenta} /></Tabs.Content>
          </>
        )}
      </Tabs.Root>
    </>
  )
}

function AutorizadosCuenta({ idCuenta, editable }: { idCuenta: number; editable: boolean }) {
  const [cliente, setCliente] = useState('')
  const [rol, setRol] = useState<RolAutorizado>('Firmante')
  const [porFinalizar, setPorFinalizar] = useState<number | null>(null)
  const cache = useQueryClient()
  const clave = ['cuentas', 'autorizados', idCuenta]
  const autorizados = useQuery({
    queryKey: clave,
    queryFn: () => consultarAutorizados(idCuenta),
  })
  const alta = useMutation({
    mutationFn: () => agregarAutorizado(idCuenta, Number(cliente), rol),
    onSuccess: async () => {
      setCliente('')
      await cache.invalidateQueries({ queryKey: clave })
    },
  })
  const fin = useMutation({
    mutationFn: (id: number) => finalizarAutorizado(idCuenta, id),
    onSuccess: async () => {
      setPorFinalizar(null)
      await cache.invalidateQueries({ queryKey: clave })
    },
  })
  return (
    <section className={cardClassName} aria-label="Autorizados de la cuenta">
      {autorizados.isPending ? <Cargando texto="Cargando autorizados…" />
        : autorizados.isError ? <ErrorApi error={autorizados.error} />
          : autorizados.data.length ? <ul className="space-y-2">
            {autorizados.data.map(item => (
              <li key={item.idCuentaAutorizado}>
                {item.rol === 'RepresentanteLegal' ? 'Representante legal' : item.rol} · {item.nombreAutorizado ?? `Cliente ${item.idClienteAutorizado}`} · Desde {item.fechaInicio}{item.fechaFin && ` hasta ${item.fechaFin}`}
                <span> · {item.vigente ? 'Vigente' : 'Finalizado'}</span>
                {editable && item.vigente && porFinalizar !== item.idCuentaAutorizado && (
                  <Button variant="ghost" onClick={() => setPorFinalizar(item.idCuentaAutorizado)}>Finalizar autorización</Button>
                )}
                {editable && item.vigente && porFinalizar === item.idCuentaAutorizado && (
                  <>
                    <Button variant="destructive" disabled={fin.isPending} onClick={() => fin.mutate(item.idCuentaAutorizado)}>Confirmar finalización</Button>
                    <Button variant="ghost" disabled={fin.isPending} onClick={() => { setPorFinalizar(null); fin.reset() }}>Cancelar</Button>
                  </>
                )}
              </li>
            ))}
          </ul> : <p>No hay autorizados registrados.</p>}
      {editable && autorizados.isSuccess && (
        <form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); alta.mutate() }}>
          <label className="grid gap-1">
            ID del cliente autorizado
            <input className="rounded border border-border bg-field p-2" type="number" required min={1} max={2147483647} step={1} value={cliente} onChange={event => setCliente(event.target.value)} />
          </label>
          <label className="grid gap-1">
            Rol del autorizado
            <select className="rounded border border-border bg-field p-2" value={rol} onChange={event => setRol(event.target.value as RolAutorizado)}>
              <option value="Firmante">Firmante</option>
              <option value="Tutor">Tutor</option>
              <option value="RepresentanteLegal">Representante legal</option>
            </select>
          </label>
          <Button type="submit" disabled={!cliente || alta.isPending}>Agregar autorizado</Button>
        </form>
      )}
      {alta.isError && <ErrorApi error={alta.error} />}
      {fin.isError && <ErrorApi error={fin.error} />}
    </section>
  )
}

function HistorialCuenta({ idCuenta }: { idCuenta: number }) {
  const eventos = useQuery({
    queryKey: ['cuentas', 'eventos', idCuenta],
    queryFn: () => consultarEventosCuenta(idCuenta),
  })
  return (
    <section className={cardClassName} aria-label="Historial de la cuenta">
      {eventos.isPending && <Cargando texto="Cargando historial…" />}
      {eventos.isError && <ErrorApi error={eventos.error} />}
      {eventos.isSuccess && (
        eventos.data.length ? (
          <ul className="space-y-4">
            {eventos.data.map(evento => (
              <li key={evento.idCuentaEvento}>
                <p className="font-medium">
                  {evento.tipoEvento === 'CambioSubproducto' ? 'Cambio de subproducto' : evento.tipoEvento} · {evento.estadoActual}
                </p>
                <time dateTime={evento.fechaEvento}>{formatearFechaConsulta(evento.fechaEvento)}</time>
                <p>{evento.detalle}</p>
              </li>
            ))}
          </ul>
        ) : <p>No hay eventos registrados.</p>
      )}
    </section>
  )
}

function AnulacionPendiente({ idCuenta }: { idCuenta: number }) {
  const cache = useQueryClient()
  const [editar, setEditar] = useState(false)
  const [motivo, setMotivo] = useState('')
  const anulacion = useMutation({
    mutationFn: () => anularApertura(idCuenta, motivo.trim()),
    onSuccess: (cuenta) => {
      cache.setQueryData(['cuentas', 'detalle', idCuenta], cuenta)
      void cache.invalidateQueries({ queryKey: ['cuentas', 'buscar'] })
      void cache.invalidateQueries({ queryKey: ['cuentas', 'eventos', idCuenta] })
    },
  })
  if (!editar) return <Button type="button" variant="outline" className="w-fit" onClick={() => setEditar(true)}>Anular apertura</Button>
  return (
    <form className={cardClassName} onSubmit={event => {
      event.preventDefault()
      if (motivo.trim()) anulacion.mutate()
    }}>
      <label className="grid gap-2 font-medium">
        Motivo de anulación
        <textarea className="rounded-lg border border-border bg-field p-3" rows={2} maxLength={300} required value={motivo} onChange={event => setMotivo(event.target.value)} />
      </label>
      {anulacion.isError && <ErrorApi error={anulacion.error} />}
      <div className="flex gap-2">
        <Button type="submit" variant="destructive" disabled={!motivo.trim() || anulacion.isPending}>Confirmar anulación</Button>
        <Button type="button" variant="ghost" disabled={anulacion.isPending} onClick={() => setEditar(false)}>Cancelar</Button>
      </div>
    </form>
  )
}

function Dato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium text-heading">{children}</dd>
    </div>
  )
}

/** Los saldos salen solo de CTA-04; el disponible se muestra tal como lo calcula el backend */
function ResumenSaldos({ idCuenta, cerrada }: { idCuenta: number; cerrada: boolean }) {
  const saldo = useSaldoCuenta(idCuenta)
  const consultado = saldo.data ? formatearFechaConsulta(saldo.data.fechaConsulta) : null

  return (
    <section aria-labelledby="saldo-cuenta" className={cardClassName}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="saldo-cuenta" className="text-lg font-semibold text-heading">
          Saldo
        </h2>
        <Button
          variant="outline"
          size="lg"
          disabled={saldo.isFetching}
          onClick={() => void saldo.refetch()}
          className="rounded-lg px-3"
        >
          <RefreshCw className={cn(saldo.isFetching && 'animate-spin')} />
          Actualizar saldo
        </Button>
      </header>

      {cerrada && <Aviso>Una cuenta cerrada no tiene saldo disponible.</Aviso>}

      {saldo.isPending ? (
        <Cargando texto="Consultando el saldo…" />
      ) : saldo.isError ? (
        <ErrorApi error={saldo.error} />
      ) : (
        <>
          <dl className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-sm text-muted-foreground">Saldo contable</dt>
              <dd className="font-medium text-heading tabular-nums">{formatearMonto(saldo.data.saldo)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-sm text-muted-foreground">Retenido</dt>
              <dd className="font-medium text-heading tabular-nums">{formatearMonto(saldo.data.saldoRetenido)}</dd>
            </div>
            <div className="flex flex-col gap-1 border-t border-border pt-4">
              <dt className="text-sm text-muted-foreground">Disponible</dt>
              <dd className="text-3xl font-bold tracking-tight text-heading tabular-nums">
                {formatearMonto(saldo.data.saldoDisponible)}
              </dd>
            </div>
          </dl>
          {consultado && <p className="text-sm text-muted-foreground">Consultado el {consultado}</p>}
        </>
      )}
    </section>
  )
}
