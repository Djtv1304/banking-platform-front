import { Button } from '@/shared/ui'
import { refreshSession } from '@/features/auth/session'
import { useEstadoAccesos } from '@/features/auth/store/estado-accesos.store'

export function EstadoActualizacionAccesos() {
  const fallo = useEstadoAccesos((s) => s.fallo)
  if (!fallo) return null
  return <div role="status" className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
    No pudimos actualizar tus accesos.
    <Button variant="outline" size="sm" onClick={() => void refreshSession()}>Reintentar actualización</Button>
  </div>
}
