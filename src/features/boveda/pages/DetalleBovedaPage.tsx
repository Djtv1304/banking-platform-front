import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { ArrowLeft, ArrowRight, ArrowRightLeft, CircleCheck, ClipboardCheck, ClipboardList, History, RefreshCw, Vault, X } from 'lucide-react'

import { cn } from '@/shared/lib'
import { Aviso, Badge, Button, Cargando } from '@/shared/ui'
import { obtenerContextoAgencias, useAuthStore } from '@/features/auth'
import { useAgencias, useDenominaciones } from '@/features/catalogos'
import { esBovedaInexistente, mensajeErrorBoveda } from '@/features/boveda/api/bovedas.api'
import type { Arqueo, Boveda, SolicitudMovimiento } from '@/features/boveda/api/bovedas.contract'
import { ArqueosBoveda } from '@/features/boveda/components/ArqueosBoveda'
import { BarraLimites, NivelSaldo } from '@/features/boveda/components/BarraLimites'
import { Denominaciones } from '@/features/boveda/components/Denominaciones'
import { MovimientosBoveda } from '@/features/boveda/components/MovimientosBoveda'
import { AprobarArqueoDialog } from '@/features/boveda/components/operaciones/AprobarArqueoDialog'
import { RegistrarArqueoDialog } from '@/features/boveda/components/operaciones/RegistrarArqueoDialog'
import { ResolverNovedadDialog } from '@/features/boveda/components/operaciones/ResolverNovedadDialog'
import { SolicitarMovimientoDialog } from '@/features/boveda/components/operaciones/SolicitarMovimientoDialog'
import { PanelPestana, Pestanas, type Pestana } from '@/features/boveda/components/Pestanas'
import { useBoveda, useBovedas } from '@/features/boveda/hooks/useBovedas'
import { accesoBoveda } from '@/features/boveda/lib/acceso'
import { leerIdBoveda } from '@/features/boveda/lib/filtros'
import {
  cupoDisponible,
  estaActiva,
  etiquetaMovimiento,
  etiquetaEstadoBoveda,
  etiquetaTipoBoveda,
  formatearMonto,
  nombreAgencia,
  valoresPorDenominacion,
} from '@/features/boveda/lib/formato'
import { textoDiferencia } from '@/features/boveda/lib/operaciones'

const SIN_FILTROS = {}

type Dialogo = 'movimiento' | 'arqueo' | 'aprobar' | null

type Historial = 'movimientos' | 'arqueos'

interface Confirmacion {
  mensaje: string
  solicitud?: SolicitudMovimiento
}

const NOTAS_HISTORIAL: Record<Historial, string> = {
  movimientos: 'Ingresos y egresos de efectivo ya ejecutados, del más reciente al más antiguo.',
  arqueos: 'Conteos físicos y novedades de la bóveda.',
}

/** BOV-02 (saldo y denominaciones), BOV-03 (movimientos) y BOV-07 (arqueos) de una bóveda; cada bloque según el rol */
export function DetalleBovedaPage() {
  const { idBoveda: param } = useParams()
  const idBoveda = leerIdBoveda(param)
  const roles = useAuthStore((state) => state.user?.roles)
  const acceso = accesoBoveda(roles ?? [])
  const contexto = useQuery({ queryKey: ['auth', 'agencias'], queryFn: ({ signal }) => obtenerContextoAgencias(signal), retry: false })
  const boveda = useBoveda(idBoveda, acceso.consultar)
  // Solo para nombrar la bóveda superior y las que dependen de esta; si falla, se muestran por ID
  const todas = useBovedas(SIN_FILTROS, acceso.listar && idBoveda !== null)
  const agencias = useAgencias()
  const catalogo = useDenominaciones()

  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const [arqueoAprobar, setArqueoAprobar] = useState<Arqueo | null>(null)
  const [arqueoNovedad, setArqueoNovedad] = useState<Arqueo | null>(null)
  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null)
  const pestanasHistorial: Pestana<Historial>[] = [
    ...(acceso.movimientos ? [{ id: 'movimientos' as const, texto: 'Movimientos', Icono: History }] : []),
    ...(acceso.arqueos ? [{ id: 'arqueos' as const, texto: 'Arqueos', Icono: ClipboardList }] : []),
  ]
  const [historialElegido, setHistorial] = useState<Historial>('movimientos')
  const historial = pestanasHistorial.some((item) => item.id === historialElegido) ? historialElegido : pestanasHistorial[0]?.id

  const abrirAprobacion = (arqueo: Arqueo | null) => {
    setArqueoAprobar(arqueo)
    setDialogo('aprobar')
  }

  const inexistente = idBoveda === null || (boveda.isError && esBovedaInexistente(boveda.error))
  const valores = valoresPorDenominacion(boveda.data?.denominaciones ?? [], catalogo.data)
  const agenciaPropia = Boolean(contexto.data?.idAgencia && contexto.data.idAgencia === boveda.data?.idAgencia)
  const puedeEscribir = agenciaPropia && estaActiva(boveda.data?.estado ?? '')

  const saldo = (() => {
    if (!acceso.consultar) {
      return (
        <Aviso>
          Tu rol puede consultar el historial de la bóveda.
        </Aviso>
      )
    }
    if (boveda.isPending) return <Cargando texto="Cargando la bóveda…" />
    if (boveda.isError) {
      return (
        <Aviso tono="error">
          {mensajeErrorBoveda(boveda.error, 'consultar el saldo de la bóveda')}
          <Button variant="outline" size="sm" disabled={boveda.isFetching} onClick={() => void boveda.refetch()} className="w-fit">
            <RefreshCw className={cn(boveda.isFetching && 'animate-spin')} />
            Reintentar
          </Button>
        </Aviso>
      )
    }
    return <SaldoYEfectivo boveda={boveda.data} todas={todas.data ?? []} />
  })()

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <Button asChild variant="ghost" size="lg" className="-ml-2.5 w-fit rounded-lg text-muted-foreground">
        <Link to="/bovedas">
          <ArrowLeft />
          Bóvedas
        </Link>
      </Button>

      {inexistente ? (
        <Aviso>No existe una bóveda con ese ID. Puede que el enlace esté incompleto.</Aviso>
      ) : (
        <>
          <header className="flex flex-wrap items-center gap-5">
            <span aria-hidden className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-brand-navy-deep text-white">
              <Vault className="size-7" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <h1 className="text-[28px] leading-tight font-bold tracking-tight text-heading sm:text-[36px]">
                {boveda.data?.codigoBoveda ?? `Bóveda ${idBoveda}`}
              </h1>
              {boveda.data && (
                <div className="flex flex-wrap items-center gap-2.5 text-sm text-muted-foreground">
                  <span>
                    {etiquetaTipoBoveda(boveda.data.tipoBoveda)} · {nombreAgencia(boveda.data.idAgencia, agencias.data)}
                  </span>
                  <Badge
                    className={cn(
                      'h-6 px-2.5',
                      estaActiva(boveda.data.estado) ? 'bg-primary/15 text-foreground' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {etiquetaEstadoBoveda(boveda.data.estado)}
                  </Badge>
                  {boveda.isFetching && (
                    <span className="flex items-center gap-1.5" role="status">
                      <RefreshCw aria-hidden className="size-3.5 animate-spin" />
                      Actualizando
                    </span>
                  )}
                </div>
              )}
            </div>
            <Acciones
              puedeMovimiento={acceso.solicitarMovimiento && puedeEscribir}
              puedeArqueo={acceso.registrarArqueo && puedeEscribir}
              onAbrir={setDialogo}
            />
          </header>

          {confirmacion && (
            <div role="status" className="flex items-start gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-5 py-4 text-sm text-foreground">
              <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-link" />
              <p className="flex-1">
                {confirmacion.mensaje}
                {confirmacion.solicitud && (
                  <>
                    {' '}
                    <Link
                      to={`/bovedas/solicitudes/${confirmacion.solicitud.idSolicitudMovimiento}`}
                      className="inline-flex items-center gap-1 rounded-sm font-semibold text-link underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Ver solicitud
                      <ArrowRight aria-hidden className="size-3.5" />
                    </Link>
                  </>
                )}
              </p>
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

          {saldo}

          {historial && (
            <Bloque
              id="historial"
              titulo="Historial"
              nota={NOTAS_HISTORIAL[historial]}
              accion={
                pestanasHistorial.length > 1 && (
                  <Pestanas id="historial" etiqueta="Historial de la bóveda" pestanas={pestanasHistorial} activa={historial} onCambiar={setHistorial} />
                )
              }
            >
              <PanelPestana id="historial" valor={historial}>
                {historial === 'movimientos' ? (
                  <MovimientosBoveda key={idBoveda} idBoveda={idBoveda} valores={valores} />
                ) : (
                  <ArqueosBoveda key={idBoveda} idBoveda={idBoveda}
                    puedeAprobar={acceso.aprobarArqueo && puedeEscribir} onAprobar={abrirAprobacion}
                    puedeResolver={acceso.resolverNovedad && puedeEscribir} onResolver={setArqueoNovedad}
                  />
                )}
              </PanelPestana>
            </Bloque>
          )}

          {boveda.data && acceso.solicitarMovimiento && (
            <SolicitarMovimientoDialog
              boveda={boveda.data}
              open={dialogo === 'movimiento'}
              onCerrar={() => setDialogo(null)}
              onCreada={(solicitud) => {
                setDialogo(null)
                setConfirmacion({
                  mensaje: `Registramos la solicitud N.º ${solicitud.idSolicitudMovimiento} de ${etiquetaMovimiento(solicitud.tipoMovimiento).toLowerCase()} por ${formatearMonto(solicitud.monto)}.`,
                  solicitud,
                })
              }}
            />
          )}
          {acceso.registrarArqueo && (
            <RegistrarArqueoDialog
              idBoveda={idBoveda}
              codigoBoveda={boveda.data?.codigoBoveda ?? `la bóveda ${idBoveda}`}
              open={dialogo === 'arqueo'}
              onCerrar={() => setDialogo(null)}
              onRegistrado={(arqueo) => {
                setHistorial('arqueos')
                setConfirmacion({
                  mensaje: `Cerramos el arqueo N.º ${arqueo.idArqueoBoveda}. ${textoDiferencia(arqueo)}.`,
                })
              }}
            />
          )}
          {arqueoNovedad?.novedad && acceso.resolverNovedad && puedeEscribir && (
            <ResolverNovedadDialog idArqueo={arqueoNovedad.idArqueoBoveda} novedad={arqueoNovedad.novedad}
              onCerrar={() => setArqueoNovedad(null)}
              onResuelta={() => {
                setConfirmacion({ mensaje: `Novedad N.º ${arqueoNovedad.novedad?.idNovedad} resuelta.` })
                setArqueoNovedad(null)
              }}
            />
          )}
          {acceso.aprobarArqueo && (
            <AprobarArqueoDialog
              open={dialogo === 'aprobar'}
              arqueo={arqueoAprobar}
              onCerrar={() => {
                setDialogo(null)
                setArqueoAprobar(null)
              }}
              onAprobado={(arqueo) =>
                setConfirmacion({
                  mensaje: `Aprobamos el arqueo N.º ${arqueo.idArqueoBoveda}${
                    arqueo.idsMovimientosAjuste.length > 0
                      ? ` y registramos ${arqueo.idsMovimientosAjuste.length === 1 ? 'su ajuste' : `${arqueo.idsMovimientosAjuste.length} ajustes`}.`
                      : '. No hizo falta ningún ajuste.'
                  }`,
                })
              }
            />
          )}
        </>
      )}
    </div>
  )
}

function Acciones({
  puedeMovimiento,
  puedeArqueo,
  onAbrir,
}: {
  puedeMovimiento: boolean
  puedeArqueo: boolean
  onAbrir: (dialogo: 'movimiento' | 'arqueo') => void
}) {
  if (!puedeMovimiento && !puedeArqueo) return null
  return (
    <div className="flex w-full flex-wrap gap-3 sm:w-auto">
      {puedeArqueo && (
        <Button variant="outline" size="lg" onClick={() => onAbrir('arqueo')} className="h-11 rounded-xl px-4 font-semibold">
          <ClipboardCheck />
          Cerrar arqueo
        </Button>
      )}
      {puedeMovimiento && (
        <Button size="lg" onClick={() => onAbrir('movimiento')} className="h-11 rounded-xl px-5 font-semibold">
          <ArrowRightLeft />
          Solicitar movimiento
        </Button>
      )}
    </div>
  )
}

function SaldoYEfectivo({ boveda, todas }: { boveda: Boveda; todas: Boveda[] }) {
  const superior = todas.find((item) => item.idBoveda === boveda.idBovedaSuperior)
  const dependientes = todas.filter((item) => item.idBovedaSuperior === boveda.idBoveda)

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <Bloque id="saldo" titulo="Saldo y límites">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Saldo actual</p>
          <p className="text-[40px] leading-none font-bold tracking-tight text-heading tabular-nums sm:text-[44px]">
            {formatearMonto(boveda.saldoActual)}
          </p>
          <NivelSaldo boveda={boveda} className="mt-1" />
        </div>

        <BarraLimites boveda={boveda} />

        <dl className="grid gap-x-6 gap-y-5 border-t border-border pt-6 sm:grid-cols-2">
          <Dato label="Límite mínimo">{formatearMonto(boveda.limiteMinimo)}</Dato>
          <Dato label="Límite máximo">{formatearMonto(boveda.limiteMaximo)}</Dato>
          <Dato label="Puede recibir hasta" nota="Antes de pasar el máximo.">
            {formatearMonto(cupoDisponible(boveda))}
          </Dato>
          <Dato label="Depende de">
            {boveda.idBovedaSuperior === null ? (
              <span className="font-normal text-muted-foreground">Ninguna: es la bóveda principal</span>
            ) : (
              <EnlaceBoveda idBoveda={boveda.idBovedaSuperior} codigo={superior?.codigoBoveda} />
            )}
          </Dato>
          {dependientes.length > 0 && (
            <Dato label="Abastece a" className="sm:col-span-2">
              <span className="flex flex-wrap gap-x-4 gap-y-1">
                {dependientes.map((item) => (
                  <EnlaceBoveda key={item.idBoveda} idBoveda={item.idBoveda} codigo={item.codigoBoveda} />
                ))}
              </span>
            </Dato>
          )}
        </dl>
      </Bloque>

      <Bloque id="denominaciones" titulo="Efectivo por denominación">
        <Denominaciones boveda={boveda} />
      </Bloque>
    </div>
  )
}

function EnlaceBoveda({ idBoveda, codigo }: { idBoveda: number; codigo?: string }) {
  return (
    <Link to={`/bovedas/${idBoveda}`} className="rounded-sm font-semibold text-link underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
      {codigo ?? `Bóveda ${idBoveda}`}
    </Link>
  )
}

function Bloque({ id, titulo, nota, accion, children }: { id: string; titulo: string; nota?: string; accion?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-6 rounded-3xl border border-border bg-card p-6 sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={id} className="text-lg font-semibold text-heading">
            {titulo}
          </h2>
          {nota && <p className="text-sm text-muted-foreground">{nota}</p>}
        </div>
        {accion}
      </header>
      {children}
    </section>
  )
}

function Dato({ label, nota, className, children }: { label: string; nota?: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium text-heading tabular-nums">{children}</dd>
      {nota && <dd className="text-sm text-muted-foreground">{nota}</dd>}
    </div>
  )
}
