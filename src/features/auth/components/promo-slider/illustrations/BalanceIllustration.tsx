import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'

import { Badge } from '@/shared/ui'
import { IllustrationCard } from './IllustrationCard'

const BAR_HEIGHTS = ['35%', '55%', '30%', '65%', '45%', '75%', '58%', '72%', '100%']

const MOVEMENTS = [
  { title: 'Transferencia recibida', date: 'Hoy', amount: '+$250,00', Icon: ArrowDownLeft, iconClassName: 'bg-brand-sky/25 text-brand-navy-deep' },
  { title: 'Pago de luz eléctrica', date: 'Ayer', amount: '-$48,20', Icon: ArrowUpRight, iconClassName: 'bg-brand-mist text-brand-navy' },
]

export function BalanceIllustration() {
  return (
    <IllustrationCard>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] text-brand-slate">Saldo disponible</p>
          <p className="mt-1 text-[28px] leading-tight font-bold tracking-tight">$12.480,35</p>
        </div>
        <Badge className="h-6 bg-brand-sky/30 px-2.5 text-brand-ink">Ahorros</Badge>
      </div>

      <div className="mt-6 flex h-[68px] items-end gap-1.5">
        {BAR_HEIGHTS.map((height, index) => (
          <span
            key={index}
            style={{ height }}
            className={index === BAR_HEIGHTS.length - 1 ? 'flex-1 rounded-md bg-brand-amber' : 'flex-1 rounded-md bg-brand-mist'}
          />
        ))}
      </div>

      <ul className="mt-5 flex flex-col gap-3 border-t border-brand-border pt-4">
        {MOVEMENTS.map(({ title, date, amount, Icon, iconClassName }) => (
          <li key={title} className="flex items-center gap-3">
            <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}>
              <Icon className="size-4" />
            </span>
            <span className="flex-1">
              <span className="block text-[13px] font-medium">{title}</span>
              <span className="block text-xs text-brand-slate">{date}</span>
            </span>
            <span className="text-[13px] font-semibold">{amount}</span>
          </li>
        ))}
      </ul>
    </IllustrationCard>
  )
}
