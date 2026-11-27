import { Link } from 'react-router'

import { ComparadorCambios, InsigniaEstado } from '@/shared/ui'
import type { DetalleEvento as DetalleEventoType } from '@/features/auditoria/api/auditoria.contract'
import { TablaEventos } from '@/features/auditoria/components/TablaEventos'
import { textoFechaLocal, tonoResultado, tonoSeveridad } from '@/features/auditoria/lib/presentacion'

function esCambiosAntesDespues(cambios: unknown): cambios is { antes: Record<string, unknown>; despues: Record<string, unknown> } {
  if (!cambios || typeof cambios !== 'object') return false
  const c = cambios as Record<string, unknown>
  return c.antes != null && typeof c.antes === 'object' && !Array.isArray(c.antes) &&
         c.despues != null && typeof c.despues === 'object' && !Array.isArray(c.despues)
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-muted-foreground">{etiqueta}</dt>
      <dd className="font-medium text-heading break-words">{children ?? '—'}</dd>
    </div>
  )
}

export function DetalleEvento({ evento }: { evento: DetalleEventoType }) {
  return (
    <div className="flex flex-col gap-6">
      {/* Encabezado */}
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold text-heading">{evento.codigoEvento ?? `Evento #${evento.id}`}</h2>
        <InsigniaEstado tono={tonoResultado(evento.resultado)}>{evento.resultado ?? 'Sin resultado'}</InsigniaEstado>
        {evento.severidad && (
          <InsigniaEstado tono={tonoSeveridad(evento.severidad)}>{evento.severidad}</InsigniaEstado>
        )}
        {evento.formatoAnterior && (
          <InsigniaEstado tono="neutro">Formato anterior</InsigniaEstado>
        )}
      </header>

      {/* Campos del evento */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Campo etiqueta="Fecha local">
            <time dateTime={evento.fechaHoraUtc ?? undefined}>{textoFechaLocal(evento.fechaHoraLocal)}</time>
          </Campo>
          <Campo etiqueta="Fecha UTC">
            <time dateTime={evento.fechaHoraUtc ?? undefined}>{evento.fechaHoraUtc ?? '—'}</time>
          </Campo>
          <Campo etiqueta="Usuario">
            {evento.usuario != null ? `ID ${evento.usuario}${evento.nombreUsuario ? ' · ' + evento.nombreUsuario : ''}` : '—'}
          </Campo>
          <Campo etiqueta="Agencia">{evento.agencia}</Campo>
          <Campo etiqueta="Canal">{evento.canal}</Campo>
          <Campo etiqueta="Origen">{evento.origen}</Campo>
          <Campo etiqueta="Tipo de objetivo">{evento.tipoObjetivo}</Campo>
          <Campo etiqueta="ID de objetivo">{evento.idObjetivo}</Campo>
          <Campo etiqueta="Correlación">{evento.correlacion}</Campo>
          <Campo etiqueta="Módulo">{evento.modulo}</Campo>
          <Campo etiqueta="Descripción">{evento.descripcion}</Campo>
        </dl>
      </section>

      {/* Cambios */}
      {evento.cambios != null && (
        <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
          <h3 className="text-lg font-semibold text-heading">Cambios</h3>
          <p className="text-sm text-muted-foreground">Antes y después tal como se registraron. Los datos personales de clientes llegan enmascarados del servidor.</p>
          {esCambiosAntesDespues(evento.cambios) ? (
            <ComparadorCambios
              antes={evento.cambios.antes as Record<string, unknown>}
              despues={evento.cambios.despues as Record<string, unknown>}
            />
          ) : (
            <pre className="whitespace-pre-wrap break-words rounded-lg bg-muted p-4 text-sm">
              {JSON.stringify(evento.cambios, null, 2)}
            </pre>
          )}
        </section>
      )}

      {/* Aprobación */}
      {evento.aprobacion && (
        <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
          <h3 className="text-lg font-semibold text-heading">Aprobación</h3>
          <dl className="grid gap-5 sm:grid-cols-2">
            <Campo etiqueta="Operación">{evento.aprobacion.operacion}</Campo>
            <Campo etiqueta="Estado">{evento.aprobacion.estado}</Campo>
            <Campo etiqueta="Solicitante">
              {evento.aprobacion.solicitante
                ? `${evento.aprobacion.solicitante.nombre ?? ''} (ID ${evento.aprobacion.solicitante.idInterno ?? '—'})`
                : '—'}
            </Campo>
            <Campo etiqueta="Fecha de solicitud">{evento.aprobacion.fechaSolicitud}</Campo>
            <Campo etiqueta="Aprobador">
              {evento.aprobacion.aprobador
                ? `${evento.aprobacion.aprobador.nombre ?? ''} (ID ${evento.aprobacion.aprobador.idInterno ?? '—'})`
                : '—'}
            </Campo>
            <Campo etiqueta="Fecha de resolución">{evento.aprobacion.fechaResolucion ?? '—'}</Campo>
          </dl>
          <Link
            to={`/aprobaciones/${evento.aprobacion.idSolicitud}`}
            className="w-fit text-sm font-medium text-link underline underline-offset-4 hover:text-heading"
          >
            Ver solicitud #{evento.aprobacion.idSolicitud}
          </Link>
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
        <h3 className="text-lg font-semibold text-heading">Eventos de la misma petición</h3>
        {evento.relacionados.length
          ? <TablaEventos eventos={evento.relacionados} titulo="Eventos con la misma correlación" />
          : <p className="text-sm text-muted-foreground">No hay otros eventos con esta correlación.</p>}
      </section>
    </div>
  )
}
