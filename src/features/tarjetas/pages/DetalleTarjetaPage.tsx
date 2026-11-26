import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft } from 'lucide-react'

import { usePuedeFuncion } from '@/features/auth'
import { toApiError } from '@/shared/api'
import { Aviso, Button, Cargando } from '@/shared/ui'
import type { Tarjeta } from '@/features/tarjetas/api/tarjetas.contract'
import { AccionesTarjeta } from '@/features/tarjetas/components/AccionesTarjeta'
import { EnvioTarjeta } from '@/features/tarjetas/components/EnvioTarjeta'
import { EstadoTarjetaBadge } from '@/features/tarjetas/components/EstadoTarjetaBadge'
import { HistorialTarjeta } from '@/features/tarjetas/components/HistorialTarjeta'
import { PinTarjeta } from '@/features/tarjetas/components/PinTarjeta'
import { usePermisosTarjeta } from '@/features/tarjetas/hooks/useAccionesTarjeta'
import { useTarjeta } from '@/features/tarjetas/hooks/useConsultaTarjetas'
import { leerId } from '@/features/tarjetas/lib/consulta'
import {
  descripcionExtension,
  etiquetaTipo,
  formatearDia,
  mensajeErrorTarjetas,
  TARJETA_INEXISTENTE,
} from '@/features/tarjetas/lib/formato-consulta'

const cardClassName = 'flex flex-col gap-6 rounded-3xl border border-border bg-card p-6 sm:p-8'

/** TAR-03 · Datos de una tarjeta en cualquier estado; nunca el PAN ni el token */
export function DetalleTarjetaPage() {
  const { idTarjeta: param } = useParams()
  // Un id no numérico o ≤ 0 no llega a la API: se trata igual que una tarjeta inexistente
  const idTarjeta = leerId(param)
  const consultar = usePuedeFuncion('tarjetas.consultar', true)
  const permisos = usePermisosTarjeta()
  const tarjeta = useTarjeta(consultar ? idTarjeta : null)

  const contenido = (() => {
    if (idTarjeta === null || (tarjeta.isError && toApiError(tarjeta.error).status === 404)) {
      return (
        <SinDetalle>
          <Aviso>{TARJETA_INEXISTENTE}</Aviso>
        </SinDetalle>
      )
    }
    if (!consultar && permisos.historial && idTarjeta !== null) return <SinDetalle><HistorialTarjeta idTarjeta={idTarjeta} /></SinDetalle>
    if (tarjeta.isError) {
      return (
        <SinDetalle>
          <Aviso tono="error">{mensajeErrorTarjetas(toApiError(tarjeta.error))}</Aviso>
        </SinDetalle>
      )
    }
    if (tarjeta.isPending) {
      return (
        <SinDetalle>
          <Cargando texto="Cargando la tarjeta…" />
        </SinDetalle>
      )
    }
    return <DetalleTarjeta tarjeta={tarjeta.data} />
  })()

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <Button asChild variant="ghost" size="lg" className="-ml-2.5 w-fit rounded-lg text-muted-foreground">
        <Link to="/tarjetas">
          <ArrowLeft />
          Volver a la búsqueda
        </Link>
      </Button>
      {contenido}
    </div>
  )
}

/** Carga, error o tarjeta inexistente: mismo título, sin datos */
function SinDetalle({ children }: { children: ReactNode }) {
  return (
    <>
      <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">Detalle de la tarjeta</h1>
      {children}
    </>
  )
}

function DetalleTarjeta({ tarjeta }: { tarjeta: Tarjeta }) {
  const permisos = usePermisosTarjeta()
  return (
    <>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading tabular-nums">
          {tarjeta.numeroEnmascarado}
        </h1>
        <EstadoTarjetaBadge estado={tarjeta.estadoActual} />
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="datos-tarjeta" className={cardClassName}>
          <h2 id="datos-tarjeta" className="text-lg font-semibold text-heading">
            Datos de la tarjeta
          </h2>
          <dl className="grid gap-5 sm:grid-cols-2">
            <Dato label="Número">{tarjeta.numeroEnmascarado}</Dato>
            <Dato label="Nombre impreso">{tarjeta.nombreTarjeta}</Dato>
            <Dato label="Tipo">{etiquetaTipo(tarjeta.tipoTarjeta)}</Dato>
            <Dato label="Estado">
              <EstadoTarjetaBadge estado={tarjeta.estadoActual} />
            </Dato>
            <Dato label="Extensión">{descripcionExtension(tarjeta)}</Dato>
            {tarjeta.idTarjetaTitular !== null && (
              <Dato label="Tarjeta titular">
                <Link to={`/tarjetas/${tarjeta.idTarjetaTitular}`} className="font-semibold text-link">
                  Ver la tarjeta {tarjeta.idTarjetaTitular}
                </Link>
              </Dato>
            )}
            <Dato label="PIN asignado">{tarjeta.pinAsignado ? 'Sí' : 'No'}</Dato>
            <Dato label="ID de la cuenta">{tarjeta.idCuenta}</Dato>
            <Dato label="ID del cliente">{tarjeta.idCliente}</Dato>
          </dl>
        </section>

        <section aria-labelledby="fechas-tarjeta" className={cardClassName}>
          <h2 id="fechas-tarjeta" className="text-lg font-semibold text-heading">
            Fechas
          </h2>
          <dl className="grid gap-5 sm:grid-cols-2">
            <Dato label="Solicitud">{formatearDia(tarjeta.fechaSolicitud)}</Dato>
            <Dato label="Resolución">{formatearDia(tarjeta.fechaResolucion)}</Dato>
            <Dato label="Emisión">{formatearDia(tarjeta.fechaEmision)}</Dato>
            <Dato label="Expiración">{formatearDia(tarjeta.fechaExpiracion)}</Dato>
          </dl>
        </section>
      </div>

      {tarjeta.envio && <EnvioTarjeta tarjeta={tarjeta} editar={permisos.estado} />}
      {tarjeta.estadoActual === 'Solicitada' ? (
        <Aviso>
          <Link className="text-link underline" to={tarjeta.idSolicitudAprobacion
            ? `/aprobaciones/${tarjeta.idSolicitudAprobacion}` : '/aprobaciones?bandeja=mias'}>
            {tarjeta.idSolicitudAprobacion ? `Ver solicitud #${tarjeta.idSolicitudAprobacion} en Aprobaciones` : 'Consultar la bandeja de Aprobaciones'}
          </Link>
        </Aviso>
      ) : <AccionesTarjeta tarjeta={tarjeta} permisos={permisos} />}
      <PinTarjeta tarjeta={tarjeta} permisos={permisos} />
      {permisos.historial && <HistorialTarjeta idTarjeta={tarjeta.idTarjeta} />}
    </>
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
