import { Link } from 'react-router'
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  CircleAlert,
  Clock,
  CreditCard,
  FileText,
  Megaphone,
  Search,
  UserPlus,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'

import { useAuthStore } from '@/features/auth'
import { cn } from '@/shared/lib'
import { Badge } from '@/shared/ui'

// ⚠️ DATOS DE EJEMPLO: reemplazar por las consultas a la API cuando existan los endpoints
const KPIS = [
  { id: 'k1', label: 'Clientes atendidos hoy', value: '48', delta: '+12% vs. ayer', trend: 'up' },
  { id: 'k2', label: 'Transacciones del día', value: '326', delta: '+5% vs. ayer', trend: 'up' },
  { id: 'k3', label: 'Solicitudes pendientes', value: '7', delta: '−2 vs. ayer', trend: 'down' },
  { id: 'k4', label: 'Efectivo en bóveda', value: '$18.450,00', delta: 'Corte 10:45', trend: null },
] as const

const PENDING = [
  { id: 's1', title: 'Apertura de cuenta de ahorro', client: 'María López', time: 'hace 15 min', status: 'urgent' },
  { id: 's2', title: 'Solicitud de crédito de consumo', client: 'Jorge Andrade', time: 'hace 40 min', status: 'review' },
  { id: 's3', title: 'Actualización de datos personales', client: 'Lucía Cevallos', time: 'hace 1 h', status: 'pending' },
  { id: 's4', title: 'Desbloqueo de usuario', client: 'Pedro Salazar', time: 'hace 2 h', status: 'pending' },
] as const

const STATUS = {
  urgent: { label: 'Urgente', className: 'bg-destructive/15 text-destructive', Icon: CircleAlert },
  review: { label: 'En revisión', className: 'bg-info/25 text-foreground', Icon: Clock },
  pending: { label: 'Pendiente', className: 'bg-muted text-muted-foreground', Icon: Clock },
}

const QUICK_ACTIONS: { label: string; Icon: LucideIcon; to?: string }[] = [
  { label: 'Registrar cliente', Icon: UserPlus, to: '/registrar-cliente' },
  { label: 'Solicitar tarjeta', Icon: CreditCard, to: '/solicitar-tarjeta' },
  { label: 'Buscar cliente', Icon: Search },
  { label: 'Apertura de cuenta', Icon: WalletCards },
  { label: 'Reportes', Icon: BarChart3 },
]

const ANNOUNCEMENTS = [
  { id: 'n1', title: 'Nueva tasa para pólizas a 180 días', date: '3 nov', body: 'Desde hoy la tasa sube a 5% anual.' },
  { id: 'n2', title: 'Mantenimiento programado', date: '1 nov', body: 'El sábado de 22:00 a 23:00 no habrá transferencias.' },
]

const cardClassName = 'rounded-2xl border border-border bg-card'
const actionClassName =
  'flex flex-col items-start gap-3 rounded-xl border border-border bg-panel p-4 text-left text-sm font-semibold text-heading transition-colors hover:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none'

const today = new Intl.DateTimeFormat('es-EC', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

export function StaffHome() {
  const user = useAuthStore((state) => state.user)
  if (!user) return null

  const firstName = user.nombre.split(' ')[0] || user.email

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section className={cn(cardClassName, 'flex flex-wrap items-center gap-x-6 gap-y-2 px-6 py-5')}>
        <div className="mr-auto">
          <h1 className="text-2xl font-bold tracking-tight text-heading">Hola, {firstName}</h1>
          <p className="mt-1 text-sm text-muted-foreground first-letter:uppercase">
            {today} · Agencia {user.idAgencia ?? 'Matriz'}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {user.roles.map((role) => (
            <Badge key={role} className="h-6 bg-info/30 px-2.5 text-foreground capitalize">
              {role}
            </Badge>
          ))}
        </div>
      </section>

      <section aria-label="Indicadores del día" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map(({ id, label, value, delta, trend }) => {
          const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Clock
          return (
            <article key={id} className={cn(cardClassName, 'p-5')}>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-heading tabular-nums">{value}</p>
              <p className="mt-2 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <TrendIcon className="size-3.5" />
                {delta}
              </p>
            </article>
          )
        })}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className={cn(cardClassName, 'p-6')}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-heading">Pendientes por revisar</h2>
            <a href="#" className="text-sm font-medium text-link hover:underline">
              Ver todos
            </a>
          </div>
          <ul className="mt-4 flex flex-col">
            {PENDING.map(({ id, title, client, time, status }) => {
              const { label, className, Icon } = STATUS[status]
              return (
                <li key={id}>
                  <a
                    href="#"
                    className="-mx-2 flex items-center gap-3 rounded-lg border-b border-border px-2 py-3 transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-link">
                      <FileText className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {client} · {time}
                      </span>
                    </span>
                    <Badge className={cn('h-6 gap-1 px-2.5', className)}>
                      <Icon className="size-3" />
                      {label}
                    </Badge>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </a>
                </li>
              )
            })}
          </ul>
        </section>

        <div className="flex flex-col gap-6">
          <section className={cn(cardClassName, 'p-6')}>
            <h2 className="font-semibold text-heading">Accesos rápidos</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {QUICK_ACTIONS.map(({ label, Icon, to }) => {
                const content = (
                  <>
                    <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-link">
                      <Icon className="size-[18px]" />
                    </span>
                    {label}
                  </>
                )
                return to ? (
                  <Link key={label} to={to} className={actionClassName}>
                    {content}
                  </Link>
                ) : (
                  <button key={label} type="button" className={actionClassName}>
                    {content}
                  </button>
                )
              })}
            </div>
          </section>

          <section className={cn(cardClassName, 'p-6')}>
            <h2 className="flex items-center gap-2 font-semibold text-heading">
              <Megaphone className="size-[18px] text-link" />
              Comunicados
            </h2>
            <ul className="mt-4 flex flex-col gap-4">
              {ANNOUNCEMENTS.map(({ id, title, date, body }) => (
                <li key={id}>
                  <p className="flex items-baseline justify-between gap-3 text-sm font-semibold">
                    {title}
                    <span className="shrink-0 text-xs font-normal text-muted-foreground">{date}</span>
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
