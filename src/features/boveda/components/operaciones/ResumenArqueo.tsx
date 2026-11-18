import { CircleCheck, CircleHelp, TriangleAlert } from 'lucide-react'

import { cn } from '@/shared/lib'
import { Badge } from '@/shared/ui'
import type { Arqueo } from '@/features/boveda/api/bovedas.contract'
import { etiquetaValor, formatearFechaHora } from '@/features/boveda/lib/formato'
import {
  arqueoPendiente,
  etiquetaEstadoArqueo,
  montoArqueo,
  piezasConSigno,
  resultadoArqueo,
  textoDiferencia,
} from '@/features/boveda/lib/operaciones'

/** Resultado de un arqueo: sistema frente a conteo, diferencia y piezas que no cuadran */
export function ResumenArqueo({ arqueo, valores }: { arqueo: Arqueo; valores: ReadonlyMap<number, number> }) {
  const resultado = resultadoArqueo(arqueo)
  const sinDato = resultado === 'sin-dato'
  // Sin datos no hay alarma que dar: se muestra con el tono neutro de «cuadra»
  const cuadra = resultado === 'cuadra' || sinDato
  const diferencias = arqueo.diferenciaPorDenominacion
    .filter((item) => item.cantidad !== 0)
    .sort((a, b) => (valores.get(b.idDenominacion) ?? 0) - (valores.get(a.idDenominacion) ?? 0))
  const estado = arqueo.estado.trim().toUpperCase()

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span className="font-semibold text-heading">Arqueo N.º {arqueo.idArqueoBoveda}</span>
        <span>·</span>
        <span>
          {arqueo.tipoArqueo} · {formatearFechaHora(arqueo.fechaHoraArqueo)}
        </span>
        <Badge
          className={cn(
            'h-6 px-2.5',
            estado === 'APROBADO' && 'bg-primary/15 text-foreground',
            estado === 'REGISTRADO' && 'bg-info/30 text-foreground',
            estado === 'ANULADO' && 'bg-muted text-muted-foreground',
          )}
        >
          {etiquetaEstadoArqueo(arqueo.estado)}
        </Badge>
      </div>

      <div
        className={cn(
          'flex items-start gap-3 rounded-2xl border p-5',
          cuadra ? 'border-info/60 bg-info/15' : 'border-destructive/40 bg-destructive/10',
        )}
      >
        {sinDato ? (
          <CircleHelp aria-hidden className="mt-0.5 size-6 shrink-0 text-muted-foreground" />
        ) : cuadra ? (
          <CircleCheck aria-hidden className="mt-0.5 size-6 shrink-0 text-heading" />
        ) : (
          <TriangleAlert aria-hidden className="mt-0.5 size-6 shrink-0 text-destructive" />
        )}
        <div className="flex flex-col gap-1">
          <p className={cn('text-xl font-bold tracking-tight tabular-nums', cuadra ? 'text-heading' : 'text-destructive')}>
            {textoDiferencia(arqueo)}
          </p>
          <p className="text-sm text-muted-foreground">
            {sinDato
              ? 'Este arqueo no guardó el saldo del sistema ni el contado.'
              : cuadra
              ? 'El efectivo contado coincide con el saldo del sistema.'
              : arqueoPendiente(arqueo)
                ? 'Al aprobar el arqueo se registran los ajustes que igualan el sistema con lo contado.'
                : 'La diferencia se registró con movimientos de ajuste.'}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-2xl border border-border p-5">
        <div className="flex flex-col gap-0.5">
          <dt className="text-sm text-muted-foreground">Según el sistema</dt>
          <dd className="text-lg font-semibold text-heading tabular-nums">{montoArqueo(arqueo.saldoTeorico)}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-sm text-muted-foreground">Contado</dt>
          <dd className="text-lg font-semibold text-heading tabular-nums">{montoArqueo(arqueo.saldoFisico)}</dd>
        </div>
        {arqueo.idsMovimientosAjuste.length > 0 && (
          <div className="col-span-2 flex flex-col gap-0.5">
            <dt className="text-sm text-muted-foreground">Movimientos de ajuste</dt>
            <dd className="font-medium text-heading">{arqueo.idsMovimientosAjuste.map((id) => `N.º ${id}`).join(', ')}</dd>
          </div>
        )}
      </dl>

      {diferencias.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-heading">Piezas que no cuadran</p>
          <ul className="flex flex-wrap gap-2">
            {diferencias.map((item) => {
              const valor = valores.get(item.idDenominacion)
              return (
                <li
                  key={item.idDenominacion}
                  className="rounded-lg border border-border bg-field px-2.5 py-1 text-sm font-medium text-heading tabular-nums"
                >
                  {valor === undefined ? `Den. ${item.idDenominacion}` : etiquetaValor(valor)}{' '}
                  <span className={item.cantidad < 0 ? 'text-destructive' : 'text-heading'}>{piezasConSigno(item.cantidad)}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {arqueo.observaciones && <p className="text-sm text-muted-foreground">«{arqueo.observaciones}»</p>}
    </div>
  )
}
