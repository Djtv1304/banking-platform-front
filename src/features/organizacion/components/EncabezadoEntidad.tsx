import { Building2 } from 'lucide-react'
import { Badge } from '@/shared/ui'
import type { Entidad } from '@/features/organizacion/api/entidad'

export function EncabezadoEntidad({ entidad }: { entidad: Pick<Entidad, 'razonSocial' | 'ruc' | 'estado'> }) {
  return (
    <section aria-label="Resumen de la cooperativa" className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-link" aria-hidden="true">
          <Building2 className="size-6" />
        </span>
        <div className="min-w-0">
          <h2 className="break-words text-xl font-semibold text-heading">{entidad.razonSocial}</h2>
          <p className="mt-1 break-words text-sm text-muted-foreground">RUC {entidad.ruc}</p>
        </div>
      </div>
      <Badge variant={entidad.estado === 'A' ? 'default' : 'outline'}>{entidad.estado === 'A' ? 'Activa' : 'Inactiva'}</Badge>
    </section>
  )
}
