import { cn } from '@/shared/lib'
import { Badge } from '@/shared/ui'
import type { EstadoCuenta } from '@/features/cuenta/api/cuentas.contract'
import { etiquetaEstado } from '@/features/cuenta/lib/formato'

const ESTILOS: Record<EstadoCuenta, string> = {
  ACTIVA: 'bg-primary/15 text-foreground',
  INACTIVA: 'bg-muted text-muted-foreground',
  BLOQUEADA: 'bg-destructive/15 text-destructive',
  CERRADA: 'border-border bg-transparent text-muted-foreground',
}

export function EstadoCuentaBadge({ estado }: { estado: EstadoCuenta }) {
  return <Badge className={cn('h-6 px-2.5', ESTILOS[estado])}>{etiquetaEstado(estado)}</Badge>
}
