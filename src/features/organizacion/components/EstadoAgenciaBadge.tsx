import { cn } from '@/shared/lib'
import { Badge } from '@/shared/ui'
import type { EstadoAgencia } from '@/features/organizacion/api/agencias.contract'
import { ETIQUETA_ESTADO } from '@/features/organizacion/lib/agencias'

const ESTILOS: Record<EstadoAgencia, string> = {
  A: 'bg-primary/15 text-foreground',
  I: 'bg-muted text-muted-foreground',
  C: 'border-border bg-transparent text-muted-foreground',
}

export function EstadoAgenciaBadge({ estado }: { estado: EstadoAgencia }) {
  return <Badge className={cn('h-6 px-2.5', ESTILOS[estado])}>{ETIQUETA_ESTADO[estado]}</Badge>
}
