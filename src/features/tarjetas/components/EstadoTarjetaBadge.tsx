import { cn } from '@/shared/lib'
import { Badge } from '@/shared/ui'
import { tonoEstado, type TonoEstado } from '@/features/tarjetas/lib/formato-consulta'

const ESTILOS: Record<TonoEstado, string> = {
  pendiente: 'border-border bg-field text-heading',
  activa: 'bg-primary/15 text-foreground',
  inactiva: 'bg-muted text-muted-foreground',
  bloqueada: 'bg-destructive/15 text-destructive',
  terminal: 'border-border bg-transparent text-muted-foreground',
  desconocido: 'bg-muted text-muted-foreground',
}

/** El texto es el estado tal como llega: uno que no conocemos se ve igual, sin romper */
export function EstadoTarjetaBadge({ estado }: { estado: string }) {
  return <Badge className={cn('h-6 px-2.5', ESTILOS[tonoEstado(estado)])}>{estado}</Badge>
}
