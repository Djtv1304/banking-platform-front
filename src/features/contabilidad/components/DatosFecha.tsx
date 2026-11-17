import { Badge } from '@/shared/ui'
import type { FechaContable } from '@/features/contabilidad/api/fecha-contable.contract'
import {
  ETIQUETA_TIPO_DIA,
  etiquetaEstadoDia,
  formatearFechaLarga,
  formatearHoraCorte,
  tipoDia,
  VARIANTE_TIPO_DIA,
} from '@/features/contabilidad/lib/fecha-contable'

/** Los datos de una fila del calendario: fecha, estado, tipo de día y hora de corte */
export function DatosFecha({ fecha }: { fecha: FechaContable }) {
  const tipo = tipoDia(fecha)
  return (
    <div className="flex flex-col gap-4">
      <p className="text-2xl font-semibold text-heading first-letter:uppercase">{formatearFechaLarga(fecha.fecha)}</p>
      <dl className="grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-muted-foreground">Estado</dt>
          <dd className="mt-1 font-medium text-heading">{etiquetaEstadoDia(fecha)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Tipo de día</dt>
          <dd className="mt-1">
            <Badge variant={VARIANTE_TIPO_DIA[tipo]}>{ETIQUETA_TIPO_DIA[tipo]}</Badge>
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Hora de corte</dt>
          <dd className="mt-1 font-medium text-heading">{formatearHoraCorte(fecha.horaCorte)}</dd>
        </div>
      </dl>
    </div>
  )
}
