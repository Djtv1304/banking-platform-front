import { useState, type ReactNode } from 'react'
import {
  ArrowDownLeft,
  ArrowLeftRight,
  CircleHelp,
  CreditCard,
  Eye,
  EyeOff,
  Flag,
  HandCoins,
  PiggyBank,
  Plus,
  Sparkles,
  Sprout,
  Target,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react'

import { useAuthStore } from '@/features/auth'
import { cn } from '@/shared/lib'

// ⚠️ DATOS DE EJEMPLO: reemplazar por las consultas a la API cuando existan los endpoints
const ACCOUNTS = [
  { id: 'a1', label: 'Ahorro', number: 'XXXX135', balance: 1250.4, Icon: PiggyBank, className: 'bg-brand-amber text-brand-ink' },
  { id: 'a2', label: 'Corriente', number: 'XXXX482', balance: 3820.15, Icon: Wallet, className: 'bg-brand-navy-deep text-white' },
  { id: 'a3', label: 'Ahorro programado', number: 'XXXX907', balance: 640, Icon: Target, className: 'bg-brand-sky text-brand-ink' },
]

const ACTIVITY = [
  { id: 't1', name: 'Angie Toscano', type: 'Transferencia', date: '18 ago', amount: -4, Icon: ArrowLeftRight },
  { id: 't2', name: 'Depósito en ventanilla', type: 'Depósito', date: '15 ago', amount: 250, Icon: ArrowDownLeft },
  { id: 't3', name: 'Empresa Eléctrica', type: 'Pago de servicios', date: '12 ago', amount: -32.5, Icon: Zap },
  { id: 't4', name: 'Carlos Méndez', type: 'Transferencia', date: '10 ago', amount: 120, Icon: ArrowLeftRight },
]

const PRODUCTS = [
  { id: 'p1', title: 'Metas', description: 'Ahorra y gana el 4.85% de interés anual.', Icon: Flag, tile: 'bg-primary/15 text-link', canAdd: true },
  { id: 'p2', title: 'Pólizas', description: 'Gana desde 3.3% hasta 5% de interés.', Icon: Sprout, tile: 'bg-info/25 text-brand-navy-deep dark:text-info' },
  { id: 'p3', title: 'Préstamos', description: 'Revisa tus valores a pagar.', Icon: HandCoins, tile: 'bg-brand-navy-deep text-white' },
]

const currency = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' })
const HIDDEN_AMOUNT = '$ •••••'

const cardClassName = 'rounded-2xl border border-border bg-card'

export function ClientHome() {
  const user = useAuthStore((state) => state.user)
  const [showBalances, setShowBalances] = useState(false)
  if (!user) return null

  const firstName = user.nombre.split(' ')[0] || user.email
  const formatAmount = (value: number, signed = false) =>
    showBalances ? `${signed && value > 0 ? '+' : ''}${currency.format(value)}` : HIDDEN_AMOUNT

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <section className={cn(cardClassName, 'flex flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4')}>
        <h1 className="mr-auto text-2xl font-bold tracking-tight text-heading">Hola, {firstName}</h1>
        <div className="flex flex-wrap items-center gap-1 text-sm font-medium">
          <HeaderAction Icon={CircleHelp}>Ayuda</HeaderAction>
          <HeaderAction Icon={Sparkles} iconClassName="text-brand-amber">
            Conoce lo nuevo
          </HeaderAction>
          <span className="mx-2 hidden h-6 w-px bg-border sm:block" />
          <HeaderAction Icon={showBalances ? EyeOff : Eye} onClick={() => setShowBalances((value) => !value)}>
            {showBalances ? 'Ocultar saldos' : 'Mostrar saldos'}
          </HeaderAction>
        </div>
      </section>

      <section aria-label="Tus cuentas" className="flex gap-4 overflow-x-auto pb-1">
        {ACCOUNTS.map(({ id, label, number, balance, Icon, className }) => (
          <article key={id} className={cn('flex w-56 shrink-0 flex-col rounded-2xl p-5 shadow-sm', className)}>
            <Icon className="size-8 opacity-90" />
            <p className="mt-6 text-xl font-bold tabular-nums">{formatAmount(balance)}</p>
            <p className="mt-1 text-sm font-medium opacity-80">
              {label} {number}
            </p>
          </article>
        ))}
      </section>

      <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section className={cn(cardClassName, 'p-6')}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-heading">Actividad reciente</h2>
            <a href="#" className="text-sm font-medium text-link hover:underline">
              Ver más
            </a>
          </div>
          <ul className="mt-4 flex flex-col">
            {ACTIVITY.map(({ id, name, type, date, amount, Icon }) => (
              <li key={id} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-link">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {type} · {date}
                  </span>
                </span>
                <span className={cn('text-sm font-semibold tabular-nums', amount > 0 && showBalances && 'text-link')}>
                  {formatAmount(amount, true)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col gap-4">
          {PRODUCTS.map(({ id, title, description, Icon, tile, canAdd }) => (
            <a
              key={id}
              href="#"
              className={cn(
                cardClassName,
                'flex items-start gap-4 p-5 transition-colors hover:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
              )}
            >
              <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', tile)}>
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-heading">{title}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{description}</span>
              </span>
              {canAdd && (
                <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Plus className="size-4" />
                </span>
              )}
            </a>
          ))}
        </div>
      </div>

      <section className={cn(cardClassName, 'p-6')}>
        <h2 className="font-semibold text-heading">Otras tarjetas de crédito</h2>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CreditCard className="size-8 text-link" />
          <p className="text-muted-foreground">Visualiza y paga tarjetas de otros bancos</p>
          <button
            type="button"
            className="mt-1 flex items-center gap-2 rounded-xl border border-dashed border-primary/60 px-5 py-2.5 text-sm font-medium text-link transition-colors hover:bg-primary/10 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Plus className="size-4" />
            Agregar tarjeta
          </button>
        </div>
      </section>
    </div>
  )
}

interface HeaderActionProps {
  Icon: LucideIcon
  iconClassName?: string
  onClick?: () => void
  children: ReactNode
}

function HeaderAction({ Icon, iconClassName, onClick, children }: HeaderActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-foreground transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <Icon className={cn('size-[18px]', iconClassName)} />
      {children}
    </button>
  )
}
