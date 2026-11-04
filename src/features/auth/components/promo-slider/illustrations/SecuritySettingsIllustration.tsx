import { Badge } from '@/shared/ui'
import { IllustrationCard } from '@/features/auth/components/promo-slider/illustrations/IllustrationCard'

const SETTINGS = [
  { title: 'Tarjeta de débito ···· 4821', detail: 'Bloqueada temporalmente' },
  { title: 'Alertas de movimientos', detail: 'Por SMS y correo' },
]

// Interruptor solo decorativo: la ilustración no es interactiva
function FakeSwitch() {
  return (
    <span className="flex h-5 w-9 shrink-0 items-center justify-end rounded-full bg-brand-amber p-0.5">
      <span className="size-4 rounded-full bg-white shadow-sm" />
    </span>
  )
}

export function SecuritySettingsIllustration() {
  return (
    <IllustrationCard>
      <p className="text-sm font-semibold">Seguridad</p>
      <p className="text-xs text-brand-slate">Controla el acceso a tus productos</p>

      <ul className="mt-3 divide-y divide-brand-border border-t border-brand-border">
        {SETTINGS.map(({ title, detail }) => (
          <li key={title} className="flex items-center justify-between gap-3 py-3">
            <span>
              <span className="block text-[13px] font-semibold">{title}</span>
              <span className="block text-xs text-brand-slate">{detail}</span>
            </span>
            <FakeSwitch />
          </li>
        ))}
        <li className="flex items-center justify-between gap-3 pt-3">
          <span>
            <span className="block text-[13px] font-semibold">Último ingreso</span>
            <span className="block text-xs text-brand-slate">Hoy, 08:42 · Este navegador</span>
          </span>
          <Badge className="h-6 bg-brand-sky/30 px-2.5 text-brand-ink">Fuiste tú</Badge>
        </li>
      </ul>
    </IllustrationCard>
  )
}
