import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, ArrowRight, Ban, CircleCheck, FileClock, RefreshCw, ShieldCheck, X, XCircle } from 'lucide-react'

import { cn } from '@/shared/lib'
import { Aviso, Button, Cargando } from '@/shared/ui'
import { useAuthStore } from '@/features/auth'
import { useAgencias, useDenominaciones } from '@/features/catalogos'
import { esBovedaInexistente, mensajeErrorBoveda } from '@/features/boveda/api/bovedas.api'
import type { SolicitudMovimiento } from '@/features/boveda/api/bovedas.contract'
import { EstadoBadge } from '@/features/boveda/components/EstadoBadge'
import {
  AprobarSolicitudDialog,
  MotivoSolicitudDialog,
  type ModoMotivo,
} from '@/features/boveda/components/solicitudes/ResolverSolicitudDialogs'
import { UsuarioOperacion } from '@/features/boveda/components/UsuarioOperacion'
import { useBovedas, useSolicitudMovimiento } from '@/features/boveda/hooks/useBovedas'
import { accesoBoveda } from '@/features/boveda/lib/acceso'
import { leerIdBoveda } from '@/features/boveda/lib/filtros'
import { etiquetaMovimiento, etiquetaValor, formatearCantidad, formatearFechaHora, formatearMonto, nombreAgencia } from '@/features/boveda/lib/formato'
import {
  etiquetaEstadoSolicitud,
  nombreBoveda,
  solicitudPendiente,
  subtotalPieza,
  textoResolucion,
  tonoEstadoSolicitud,
  valoresDeSolicitud,
} from '@/features/boveda/lib/solicitudes'

const SIN_FILTROS = {}

/** SMV-03 a SMV-06 · Una solicitud de movimiento: qué se pide, quién y, si sigue pendiente, aprobar, rechazar o cancelar */
export function DetalleSolicitudPage() {
  const { idSolicitud: param } = useParams()
  const idSolicitud = leerIdBoveda(param)
  const roles = useAuthStore((state) => state.user?.roles)
  const acceso = accesoBoveda(roles ?? [])
  const solicitud = useSolicitudMovimiento(idSolicitud, acceso.solicitudes)
  const bovedas = useBovedas(SIN_FILTROS, acceso.listar)
  const agencias = useAgencias()
  const catalogo = useDenominaciones()

  const [aprobando, setAprobando] = useState(false)
  const [motivo, setMotivo] = useState<ModoMotivo | null>(null)
  const [confirmacion, setConfirmacion] = useState<string | null>(null)

  const volver = (
    <Button asChild variant="ghost" size="lg" className="-ml-2.5 w-fit rounded-lg text-muted-foreground">
      <Link to="/bovedas?vista=solicitudes">
        <ArrowLeft />
        Solicitudes de movimiento
      </Link>
    </Button>
  )

  const contenido = (() => {
    if (!acceso.solicitudes) return <Aviso tono="error">Tu rol no tiene permiso para consultar las solicitudes de movimiento.</Aviso>
    if (idSolicitud === null || (solicitud.isError && esBovedaInexistente(solicitud.error))) {
      return <Aviso>No existe una solicitud con ese número. Puede que el enlace esté incompleto.</Aviso>
    }
    if (solicitud.isPending) return <Cargando texto="Cargando la solicitud…" />
    if (solicitud.isError) {
      return (
        <Aviso tono="error">
          {mensajeErrorBoveda(solicitud.error, 'consultar las solicitudes de movimiento', 'No existe una solicitud con ese número.')}
          <Button variant="outline" size="sm" disabled={solicitud.isFetching} onClick={() => void solicitud.refetch()} className="w-fit">
            <RefreshCw className={cn(solicitud.isFetching && 'animate-spin')} />
            Reintentar
          </Button>
        </Aviso>
      )
    }

    const datos = solicitud.data
    const lista = bovedas.data ?? []
    const nombrar = (idBoveda: number) => nombreBoveda(idBoveda, lista) ?? `Bóveda ${idBoveda}`
    const origen = nombrar(datos.idBoveda)
    const contraparte = nombreBoveda(datos.idBovedaContraparte, lista)
    const pendiente = solicitudPendiente(datos)
    const puedeResolver = pendiente && acceso.resolverSolicitud
    const puedeCancelar = pendiente && acceso.cancelarSolicitud

    return (
      <>
        <header className="flex flex-wrap items-start gap-5">
          <span aria-hidden className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-brand-navy-deep text-white">
            <FileClock className="size-7" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <p className="text-sm font-medium text-muted-foreground">Solicitud N.º {datos.idSolicitudMovimiento}</p>
            <h1 className="text-[28px] leading-tight font-bold tracking-tight text-heading sm:text-[34px]">{etiquetaMovimiento(datos.tipoMovimiento)}</h1>
            <div className="flex flex-wrap items-center gap-2.5 text-sm text-muted-foreground">
              <EstadoBadge tono={tonoEstadoSolicitud(datos.estado)}>{etiquetaEstadoSolicitud(datos.estado)}</EstadoBadge>
              <span>Solicitada el {formatearFechaHora(datos.fechaSolicitud)}</span>
              {solicitud.isFetching && (
                <span className="flex items-center gap-1.5" role="status">
                  <RefreshCw aria-hidden className="size-3.5 animate-spin" />
                  Actualizando
                </span>
              )}
            </div>
          </div>
          {(puedeResolver || puedeCancelar) && (
            <div className="flex w-full flex-wrap gap-3 sm:w-auto">
              {puedeCancelar && (
                <Button variant="ghost" size="lg" onClick={() => setMotivo('cancelar')} className="h-11 rounded-xl px-4 text-muted-foreground">
                  <Ban />
                  Cancelar
                </Button>
              )}
              {puedeResolver && (
                <>
                  <Button variant="outline" size="lg" onClick={() => setMotivo('rechazar')} className="h-11 rounded-xl px-4 font-semibold">
                    <XCircle />
                    Rechazar
                  </Button>
                  <Button size="lg" onClick={() => setAprobando(true)} className="h-11 rounded-xl px-5 font-semibold">
                    <ShieldCheck />
                    Aprobar y ejecutar
                  </Button>
                </>
              )}
            </div>
          )}
        </header>

        {confirmacion && (
          <div role="status" className="flex items-start gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-5 py-4 text-sm text-foreground">
            <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-link" />
            <p className="flex-1">{confirmacion}</p>
            <button
              type="button"
              onClick={() => setConfirmacion(null)}
              aria-label="Cerrar aviso"
              className="rounded-md p-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {pendiente && !acceso.resolverSolicitud && (
          <Aviso>Esta solicitud espera la aprobación de un Supervisor o Administrador. El saldo no cambia hasta entonces.</Aviso>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <Bloque id="solicitud-resumen" titulo="Qué se mueve">
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">Monto</p>
              <p className="text-[40px] leading-none font-bold tracking-tight text-heading tabular-nums sm:text-[44px]">{formatearMonto(datos.monto)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-field p-4">
              <EnlaceBoveda idBoveda={datos.idBoveda} codigo={origen} rotulo={contraparte ? 'Sale de' : 'Bóveda'} />
              {contraparte && datos.idBovedaContraparte != null && (
                <>
                  <ArrowRight aria-hidden className="size-5 text-muted-foreground" />
                  <EnlaceBoveda idBoveda={datos.idBovedaContraparte} codigo={contraparte} rotulo="Entra a" />
                </>
              )}
            </div>
            <dl className="grid gap-x-6 gap-y-5 border-t border-border pt-6 sm:grid-cols-2">
              <Dato label="Solicitada por">
                <UsuarioOperacion idUsuario={datos.idUsuarioSolicitante} />
              </Dato>
              <Dato label="Agencia">{datos.idAgencia ? nombreAgencia(datos.idAgencia, agencias.data) : <Vacio>Sin agencia</Vacio>}</Dato>
              {datos.observaciones && (
                <Dato label="Observaciones" className="sm:col-span-2">
                  <span className="font-normal text-foreground">{datos.observaciones}</span>
                </Dato>
              )}
            </dl>
          </Bloque>

          <Bloque id="solicitud-desglose" titulo="Desglose del efectivo">
            <Desglose solicitud={datos} catalogo={catalogo.data} />
          </Bloque>
        </div>

        {!pendiente && (
          <Bloque id="solicitud-resolucion" titulo="Resolución">
            <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              <Dato label={textoResolucion(datos.estado)}>
                <UsuarioOperacion idUsuario={datos.idUsuarioResolucion} />
              </Dato>
              <Dato label="Fecha">{datos.fechaResolucion ? formatearFechaHora(datos.fechaResolucion) : <Vacio>—</Vacio>}</Dato>
              {datos.idsMovimientos.length > 0 && (
                <Dato label="Movimientos registrados">
                  <span className="flex flex-wrap gap-1.5">
                    {datos.idsMovimientos.map((id) => (
                      <span key={id} className="rounded-lg border border-border bg-field px-2 py-0.5 text-sm">
                        N.º {id}
                      </span>
                    ))}
                  </span>
                </Dato>
              )}
              {datos.motivoResolucion && (
                <Dato label="Motivo" className="sm:col-span-2 lg:col-span-3">
                  <span className="font-normal text-foreground">«{datos.motivoResolucion}»</span>
                </Dato>
              )}
            </dl>
          </Bloque>
        )}

        {acceso.resolverSolicitud && (
          <AprobarSolicitudDialog
            open={aprobando}
            solicitud={datos}
            origen={origen}
            contraparte={contraparte}
            nombrar={nombrar}
            onCerrar={() => setAprobando(false)}
          />
        )}
        {(acceso.resolverSolicitud || acceso.cancelarSolicitud) && (
          <MotivoSolicitudDialog
            modo={motivo}
            solicitud={datos}
            onCerrar={() => setMotivo(null)}
            onResuelta={(resuelta, modo) => {
              setMotivo(null)
              setConfirmacion(
                `${modo === 'rechazar' ? 'Rechazamos' : 'Cancelamos'} la solicitud N.º ${resuelta.idSolicitudMovimiento}. El movimiento no se ejecutará.`,
              )
            }}
          />
        )}
      </>
    )
  })()

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {volver}
      {contenido}
    </div>
  )
}

function Desglose({ solicitud, catalogo }: { solicitud: SolicitudMovimiento; catalogo: readonly { idDenominacion: number; valor: number }[] }) {
  const valores = valoresDeSolicitud(solicitud, catalogo)
  const piezas = [...solicitud.desglose].sort((a, b) => (valores.get(b.idDenominacion) ?? 0) - (valores.get(a.idDenominacion) ?? 0))
  if (piezas.length === 0) return <p className="text-sm text-muted-foreground">La solicitud no trae el desglose por denominación.</p>

  return (
    <table className="w-full text-left text-sm">
      <caption className="sr-only">Piezas por denominación</caption>
      <thead className="border-b border-border text-muted-foreground">
        <tr>
          <th scope="col" className="py-2.5 pr-3 font-medium">Denominación</th>
          <th scope="col" className="px-3 py-2.5 text-right font-medium">Piezas</th>
          <th scope="col" className="py-2.5 pl-3 text-right font-medium">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        {piezas.map((pieza) => {
          const valor = valores.get(pieza.idDenominacion)
          const subtotal = subtotalPieza(pieza.cantidad, valor)
          return (
            <tr key={pieza.idDenominacion} className="border-b border-border last:border-0">
              <td className="py-3 pr-3 font-semibold text-heading">{valor === undefined ? `Den. ${pieza.idDenominacion}` : etiquetaValor(valor)}</td>
              <td className="px-3 py-3 text-right text-heading tabular-nums">{formatearCantidad(pieza.cantidad)}</td>
              <td className="py-3 pl-3 text-right text-heading tabular-nums">{subtotal === null ? '—' : formatearMonto(subtotal)}</td>
            </tr>
          )
        })}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-border">
          <th scope="row" colSpan={2} className="pt-3 pr-3 text-right font-medium text-muted-foreground">
            Total
          </th>
          <td className="pt-3 pl-3 text-right text-base font-bold text-heading tabular-nums">{formatearMonto(solicitud.monto)}</td>
        </tr>
      </tfoot>
    </table>
  )
}

function EnlaceBoveda({ idBoveda, codigo, rotulo }: { idBoveda: number; codigo: string; rotulo: string }) {
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{rotulo}</span>
      <Link to={`/bovedas/${idBoveda}`} className="rounded-sm font-semibold text-link underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
        {codigo}
      </Link>
    </span>
  )
}

function Bloque({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-6 rounded-3xl border border-border bg-card p-6 sm:p-8">
      <h2 id={id} className="text-lg font-semibold text-heading">
        {titulo}
      </h2>
      {children}
    </section>
  )
}

function Dato({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium text-heading tabular-nums">{children}</dd>
    </div>
  )
}

const Vacio = ({ children }: { children: ReactNode }) => <span className="font-normal text-muted-foreground">{children}</span>
