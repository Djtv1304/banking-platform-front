import { cn } from '@/shared/lib'
import { Badge } from '@/shared/ui'
import { tonoEstado, type TonoEstado } from '@/features/usuarios/lib/formato'

const ESTILOS: Record<TonoEstado, string> = {
  activo: 'bg-primary/15 text-foreground',
  inactivo: 'bg-muted text-muted-foreground',
  bloqueado: 'bg-destructive/15 text-destructive',
  otro: 'border-border bg-transparent text-muted-foreground',
}

export function EstadoUsuarioBadge({ estado, className }: { estado: string; className?: string }) {
  return <Badge className={cn('h-6 px-2.5', ESTILOS[tonoEstado(estado)], className)}>{estado}</Badge>
}
