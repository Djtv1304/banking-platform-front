import type { ReactNode } from 'react'

import { cn } from '@/shared/lib'
import { Badge } from '@/shared/ui'
import type { CupoEfectivo } from '@/features/cuenta/api/cupos.contract'
import { disponibleCupo, textoVigencia } from '@/features/cuenta/lib/cupos'
import { formatearMonto } from '@/features/cuenta/lib/formato'

interface TarjetaCupoProps {
  cupo: CupoEfectivo
  nombreCanal: string
  /** Acciones según el rol (editar, historial) */
  children?: ReactNode
}

/** El cupo que rige en un canal (CTA-07), lo consumido y lo que queda disponible */
export function TarjetaCupo({ cupo, nombreCanal, children }: TarjetaCupoProps) {
  const libre = disponibleCupo(cupo)
  const tituloId = `canal-${cupo.idCanal}`

  return (
    <article aria-labelledby={tituloId} className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={tituloId} className="text-lg font-semibold text-heading">
          {nombreCanal}
        </h2>
        <Badge
          className={cn(
            'h-6 px-2.5',
            cupo.origen === 'Personalizado' ? 'bg-primary/15 text-foreground' : 'bg-muted text-muted-foreground',
          )}
        >
          {cupo.origen}
        </Badge>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Consumo titulo="Diario" cupo={cupo.cupoDiario} consumido={cupo.consumidoHoy} libre={libre.diario} periodo="hoy" />
        <Consumo
          titulo="Mensual"
          cupo={cupo.cupoMensual}
          consumido={cupo.consumidoMes}
          libre={libre.mensual}
          periodo="en el mes"
        />
      </div>

      <dl className="grid gap-4 sm:grid-cols-3">
        <Dato label="Máximo por transacción">{formatearMonto(cupo.montoMaxTransaccion)}</Dato>
        <Dato label="Transacciones por día">{cupo.maxTransaccionesDia}</Dato>
        <Dato label="Vigencia">{textoVigencia(cupo.fechaVigencia)}</Dato>
      </dl>

      {children && <div className="flex flex-wrap gap-2 border-t border-border pt-4">{children}</div>}
    </article>
  )
}

interface ConsumoProps {
  titulo: string
  cupo: number
  consumido: number
  libre: number
  periodo: string
}

function Consumo({ titulo, cupo, consumido, libre, periodo }: ConsumoProps) {
  return (
    <section aria-label={`Cupo ${titulo.toLowerCase()}`} className="flex flex-col gap-3 rounded-2xl bg-field p-4">
      <h3 className="text-sm font-semibold text-heading">{titulo}</h3>
      <dl className="flex flex-col gap-2 text-sm">
        <Fila label="Cupo">{formatearMonto(cupo)}</Fila>
        <Fila label={`Consumido ${periodo}`}>{formatearMonto(consumido)}</Fila>
        <div className="flex flex-col gap-1 border-t border-border pt-2">
          <dt className="text-muted-foreground">Disponible</dt>
          <dd className="text-2xl font-bold tracking-tight text-heading tabular-nums">{formatearMonto(libre)}</dd>
        </div>
      </dl>
    </section>
  )
}

function Fila({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-heading tabular-nums">{children}</dd>
    </div>
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
