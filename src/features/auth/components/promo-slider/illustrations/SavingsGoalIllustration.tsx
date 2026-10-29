import { TrendingUp } from 'lucide-react'

import { Badge } from '@/shared/ui'
import { IllustrationCard } from './IllustrationCard'

const STATS = [
  { label: 'Aporte mensual', value: '$150,00' },
  { label: 'Próximo aporte', value: '5 de nov.' },
]

export function SavingsGoalIllustration() {
  return (
    <div className="relative pb-12">
      <IllustrationCard>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] text-brand-slate">Meta de ahorro</p>
          <Badge className="h-6 bg-brand-sky/30 px-2.5 text-brand-ink">64 %</Badge>
        </div>
        <p className="mt-2 text-lg font-semibold">Fondo de estudios</p>
        <p className="mt-3 flex items-baseline gap-1.5">
          <span className="text-[28px] leading-tight font-bold tracking-tight">$3.200,00</span>
          <span className="text-[13px] text-brand-slate">de $5.000,00</span>
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-mist">
          <div className="h-full w-[64%] rounded-full bg-brand-amber" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {STATS.map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-brand-mist/60 px-3.5 py-3">
              <p className="text-xs text-brand-slate">{label}</p>
              <p className="mt-0.5 text-sm font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </IllustrationCard>

      <div className="absolute right-0 bottom-0 flex w-[82%] items-center gap-3 rounded-xl bg-brand-navy p-3.5 text-white shadow-xl shadow-black/25 ring-1 ring-white/10">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
          <TrendingUp className="size-4 text-brand-sky" />
        </span>
        <span>
          <span className="block text-sm font-semibold">Simulador de plazo fijo</span>
          <span className="block text-xs text-white/70">$2.000 · 180 días</span>
        </span>
      </div>
    </div>
  )
}
