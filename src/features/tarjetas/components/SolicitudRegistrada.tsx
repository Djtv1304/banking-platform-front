import { CircleCheck, CreditCard } from 'lucide-react'

import { Button } from '@/shared/ui'
import type { Cliente, Tarjeta } from '@/features/tarjetas/api/tarjetas.contract'
import { nombreCliente } from '@/features/tarjetas/lib/formulario'

interface SolicitudRegistradaProps {
  tarjeta: Tarjeta
  cliente: Cliente
  onNueva: () => void
}

const fecha = (valor: string | null) =>
  valor ? new Intl.DateTimeFormat('es-EC', { dateStyle: 'long' }).format(new Date(`${valor}T00:00:00`)) : '—'

export function SolicitudRegistrada({ tarjeta, cliente, onNueva }: SolicitudRegistradaProps) {
  const resumen = [
    { label: 'Número', valor: tarjeta.numeroEnmascarado },
    { label: 'Tipo', valor: tarjeta.tipoTarjeta === 'Debito' ? 'Débito' : 'Crédito' },
    { label: 'Nombre impreso', valor: tarjeta.nombreTarjeta },
    { label: 'Estado', valor: tarjeta.estadoActual },
    { label: 'Fecha de solicitud', valor: fecha(tarjeta.fechaSolicitud) },
    { label: 'Cliente', valor: nombreCliente(cliente) },
  ]

  return (
    <section
      role="status"
      className="flex flex-col items-center gap-6 rounded-3xl border border-border bg-card p-6 py-10 text-center not-dark:shadow-xl not-dark:shadow-brand-ink/5 sm:p-10"
    >
      <span className="flex size-16 items-center justify-center rounded-full bg-primary/15 text-link">
        <CircleCheck className="size-8" />
      </span>
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-heading">Solicitud registrada</h2>
        <p className="max-w-md text-muted-foreground">
          La tarjeta quedó <span className="font-semibold text-heading">{tarjeta.estadoActual}</span> y pasa a
          aprobación. El PIN se generará al aprobarla.
        </p>
      </div>

      <dl className="grid w-full max-w-lg gap-px overflow-hidden rounded-2xl border border-border bg-border text-left sm:grid-cols-2">
        {resumen.map(({ label, valor }) => (
          <div key={label} className="flex flex-col gap-0.5 bg-field px-4 py-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="truncate font-medium text-heading">{valor}</dd>
          </div>
        ))}
      </dl>

      <Button onClick={onNueva} className="h-[52px] rounded-xl px-8 text-base font-semibold hover:bg-primary/90">
        <CreditCard />
        Solicitar otra tarjeta
      </Button>
    </section>
  )
}
