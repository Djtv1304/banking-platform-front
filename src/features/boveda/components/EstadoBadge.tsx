import { cn } from '@/shared/lib'
import { Badge } from '@/shared/ui'
import type { TonoEstado } from '@/features/boveda/lib/solicitudes'

const TONOS: Record<TonoEstado, string> = {
  pendiente: 'bg-info/30 text-foreground',
  exito: 'bg-primary/15 text-foreground',
  rechazo: 'bg-destructive/10 text-destructive',
  neutro: 'bg-muted text-muted-foreground',
}

/** Estado de una solicitud o de un arqueo, con el mismo código de color en toda la sección */
export function EstadoBadge({ tono, children, className }: { tono: TonoEstado; children: string; className?: string }) {
  return (
    <Badge className={cn('h-6 gap-1.5 px-2.5', TONOS[tono], className)}>
      <span aria-hidden className={cn('size-1.5 rounded-full bg-current', tono === 'pendiente' && 'animate-pulse')} />
      {children}
    </Badge>
  )
}
