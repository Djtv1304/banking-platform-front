import type { FechaContable } from '@/features/contabilidad/api/fecha-contable.contract'
import { DatosFecha } from '@/features/contabilidad/components/DatosFecha'
import { textoCorte } from '@/features/contabilidad/lib/fecha-contable'

/** Tarjeta «Fecha contable vigente»: la fecha con la que se registra lo de hoy */
export function FechaVigente({ fecha }: { fecha: FechaContable }) {
  return (
    <section aria-labelledby="fecha-vigente-titulo" className="rounded-3xl border border-border bg-card p-6 not-dark:shadow-xl not-dark:shadow-brand-ink/5 sm:p-8">
      <h2 id="fecha-vigente-titulo" className="mb-4 text-lg font-semibold text-heading">Fecha contable vigente</h2>
      <DatosFecha fecha={fecha} />
      <p className="mt-5 text-sm text-muted-foreground">{textoCorte(fecha.horaCorte)}</p>
    </section>
  )
}
