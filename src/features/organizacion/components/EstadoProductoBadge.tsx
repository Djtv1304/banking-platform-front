import { cn } from '@/shared/lib'
import { Badge } from '@/shared/ui'
import type { EstadoProducto } from '@/features/organizacion/api/productos.contract'

export function EstadoProductoBadge({ estado, estadoCatalogo }: { estado: EstadoProducto; estadoCatalogo?: string | null }) {
  return (
    <Badge className={cn('h-6 px-2.5', estado === 'A' ? 'bg-primary/15 text-foreground' : 'bg-muted text-muted-foreground')}>
      {estadoCatalogo ?? (estado === 'A' ? 'Activo' : 'Suspendido')}
    </Badge>
  )
}
