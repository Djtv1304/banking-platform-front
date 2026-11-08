import { cn } from '@/shared/lib'
import type { EstadoCuenta } from '@/features/cuenta/api/cuenta.contract'
import { ESTADOS_CUENTA } from '@/features/cuenta/lib/estados'

export function EstadoCuentaBadge({ estado }: { estado: EstadoCuenta }) {
  const { label, Icon, className } = ESTADOS_CUENTA[estado]
  return (
    <span className={cn('inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold', className)}>
      <Icon className="size-3.5" />
      {label}
    </span>
  )
}
