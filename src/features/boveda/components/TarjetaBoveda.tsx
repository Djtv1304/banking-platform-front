import { Link } from 'react-router'
import { ArrowRight, Vault } from 'lucide-react'

import { Badge } from '@/shared/ui'
import type { Boveda } from '@/features/boveda/api/bovedas.contract'
import { BarraLimites, NivelSaldo } from '@/features/boveda/components/BarraLimites'
import { estaActiva, etiquetaEstadoBoveda, etiquetaTipoBoveda, formatearMonto } from '@/features/boveda/lib/formato'

interface TarjetaBovedaProps {
  boveda: Boveda
  agencia: string
  /** Código de la bóveda de la que depende, si está en el listado */
  superior?: string
}

/** Una bóveda del listado: toda la tarjeta abre su detalle */
export function TarjetaBoveda({ boveda, agencia, superior }: TarjetaBovedaProps) {
  return (
    <li className="group relative flex flex-col gap-6 rounded-3xl border border-border bg-card p-6 transition-colors hover:border-foreground/25 sm:p-7">
      <div className="flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Vault aria-hidden className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="text-lg leading-tight font-semibold text-heading">
            <Link
              to={`/bovedas/${boveda.idBoveda}`}
              className="outline-none after:absolute after:inset-0 after:rounded-3xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
            >
              {boveda.codigoBoveda}
            </Link>
          </h2>
          <p className="truncate text-sm text-muted-foreground">
            {etiquetaTipoBoveda(boveda.tipoBoveda)} · {agencia}
          </p>
        </div>
        {!estaActiva(boveda.estado) && (
          <Badge className="h-6 bg-muted px-2.5 text-muted-foreground">{etiquetaEstadoBoveda(boveda.estado)}</Badge>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-sm text-muted-foreground">Saldo actual</p>
        <p className="text-[32px] leading-none font-bold tracking-tight text-heading tabular-nums">
          {formatearMonto(boveda.saldoActual)}
        </p>
        <NivelSaldo boveda={boveda} className="mt-1" />
      </div>

      <BarraLimites boveda={boveda} />

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4 text-sm">
        <span className="truncate text-muted-foreground">
          {boveda.idBovedaSuperior === null ? 'Bóveda principal' : `Depende de ${superior ?? `la bóveda ${boveda.idBovedaSuperior}`}`}
        </span>
        <span aria-hidden className="flex shrink-0 items-center gap-1.5 font-semibold text-link">
          Ver bóveda
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </li>
  )
}
