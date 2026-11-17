import { cn } from '@/shared/lib'
import { Badge } from '@/shared/ui'
import { etiquetaEstadoAsiento, tonoEstadoAsiento, type TonoEstadoAsiento } from '@/features/contabilidad/lib/asientos'

const ESTILOS: Record<TonoEstadoAsiento, string> = {
  exito: 'bg-primary/15 text-foreground',
  advertencia: 'border-link/60 bg-transparent text-link',
  apagado: 'border-border bg-muted text-muted-foreground line-through',
  neutro: 'border-border bg-field text-heading',
}

/** El estado es texto libre en el backend: uno que no conocemos se muestra tal cual, en neutro */
export function EstadoAsientoBadge({ estado }: { estado: string }) {
  return <Badge className={cn('h-6 px-2.5', ESTILOS[tonoEstadoAsiento(estado)])}>{etiquetaEstadoAsiento(estado)}</Badge>
}
