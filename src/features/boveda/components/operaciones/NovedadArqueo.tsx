import type { Arqueo } from '@/features/boveda/api/bovedas.contract'
import { EstadoBadge } from '@/features/boveda/components/EstadoBadge'
import { UsuarioOperacion } from '@/features/boveda/components/UsuarioOperacion'
import { formatearFechaHora, formatearMonto } from '@/features/boveda/lib/formato'
import { ETIQUETAS_RESOLUCION_NOVEDAD } from '@/features/boveda/lib/operaciones'

export function NovedadArqueo({ novedad }: { novedad: NonNullable<Arqueo['novedad']> }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="font-semibold text-heading">Novedad de cajero N.º {novedad.idNovedad}</h4>
        <EstadoBadge tono={novedad.estado === 'RESUELTA' ? 'exito' : novedad.estado === 'VENCIDA' ? 'rechazo' : 'pendiente'}>
          {{ PENDIENTE: 'Pendiente', VENCIDA: 'Vencida', RESUELTA: 'Resuelta' }[novedad.estado]}
        </EstadoBadge>
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3 [&_dt]:text-muted-foreground [&_dd]:font-medium [&_dd]:text-heading">
        <div><dt>Responsable</dt><dd><UsuarioOperacion idUsuario={novedad.idUsuarioResponsable} /></dd></div>
        <div><dt>Monto</dt><dd>{formatearMonto(novedad.monto)}</dd></div>
        <div><dt>Vencimiento</dt><dd>{formatearFechaHora(novedad.fechaVencimiento)}</dd></div>
        {novedad.tipoResolucion && <div><dt>Resolución</dt><dd>{ETIQUETAS_RESOLUCION_NOVEDAD[novedad.tipoResolucion]}</dd></div>}
        {novedad.referenciaResolucion && <div><dt>Respaldo</dt><dd>{novedad.referenciaResolucion}</dd></div>}
        {novedad.fechaResolucion && <div><dt>Fecha de resolución</dt><dd>{formatearFechaHora(novedad.fechaResolucion)}</dd></div>}
        {novedad.idUsuarioResolucion != null && (
          <div><dt>Resuelta por</dt><dd><UsuarioOperacion idUsuario={novedad.idUsuarioResolucion} /></dd></div>
        )}
        {novedad.idAsientoContable != null && <div><dt>Asiento del faltante</dt><dd>N.º {novedad.idAsientoContable}</dd></div>}
        {novedad.idAsientoResolucion != null && <div><dt>Asiento de resolución</dt><dd>N.º {novedad.idAsientoResolucion}</dd></div>}
        {novedad.idMovimientoReposicion != null && <div><dt>Movimiento de reposición</dt><dd>N.º {novedad.idMovimientoReposicion}</dd></div>}
      </dl>
      {novedad.observacionesResolucion && <p className="text-sm text-muted-foreground">{novedad.observacionesResolucion}</p>}
    </section>
  )
}
