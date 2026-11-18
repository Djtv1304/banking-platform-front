import { TriangleAlert } from 'lucide-react'

import { cn } from '@/shared/lib'
import type { Boveda } from '@/features/boveda/api/bovedas.contract'
import { formatearMonto, nivelSaldo, posicionesBarra, textoNivel } from '@/features/boveda/lib/formato'

type Limites = Pick<Boveda, 'saldoActual' | 'limiteMinimo' | 'limiteMaximo'>

/** Frase del saldo frente a sus límites; en rojo y con ícono cuando está fuera */
export function NivelSaldo({ boveda, className }: { boveda: Limites; className?: string }) {
  const fuera = nivelSaldo(boveda) !== 'normal'
  return (
    <p className={cn('flex items-center gap-1.5 text-sm', fuera ? 'font-medium text-destructive' : 'text-muted-foreground', className)}>
      {fuera ? (
        <TriangleAlert aria-hidden className="size-4 shrink-0" />
      ) : (
        <span aria-hidden className="size-2 shrink-0 rounded-full bg-info" />
      )}
      {textoNivel(boveda)}
    </p>
  )
}

/**
 * Dónde cae el saldo: la franja celeste es el rango permitido (mínimo a máximo) y el punto, el
 * saldo. Es un apoyo visual: los tres montos también se leen como texto.
 */
export function BarraLimites({ boveda }: { boveda: Limites }) {
  const { saldo, minimo, maximo } = posicionesBarra(boveda)
  const fuera = nivelSaldo(boveda) !== 'normal'

  return (
    <div
      role="img"
      aria-label={`Saldo ${formatearMonto(boveda.saldoActual)}. Mínimo ${formatearMonto(boveda.limiteMinimo)}, máximo ${formatearMonto(boveda.limiteMaximo)}. ${textoNivel(boveda)}.`}
      className="flex flex-col gap-2"
    >
      <div className="relative h-2 rounded-full bg-muted">
        <span
          className="absolute inset-y-0 rounded-full bg-info/60"
          style={{ left: `${minimo}%`, width: `${Math.max(0, maximo - minimo)}%` }}
        />
        <span
          className={cn(
            'absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-card shadow-sm',
            fuera ? 'bg-destructive' : 'bg-heading',
          )}
          style={{ left: `${saldo}%` }}
        />
      </div>
      <div className="relative h-4 text-xs text-muted-foreground tabular-nums">
        <span className="absolute whitespace-nowrap" style={{ left: `${minimo}%` }}>
          Mín. {formatearMonto(boveda.limiteMinimo)}
        </span>
        <span className="absolute whitespace-nowrap" style={{ right: `${100 - maximo}%` }}>
          Máx. {formatearMonto(boveda.limiteMaximo)}
        </span>
      </div>
    </div>
  )
}
