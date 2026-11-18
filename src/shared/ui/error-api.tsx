import { toApiError } from '@/shared/api'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'

export function ErrorApi({ error, reintentar }: { error: unknown; reintentar?: () => void }) {
  const normalizado = toApiError(error)
  return <Aviso tono="error"><p>{normalizado.message}</p>{normalizado.traceId && <p className="text-xs">Referencia: {normalizado.traceId}</p>}{reintentar && <Button variant="outline" onClick={reintentar}>Reintentar</Button>}</Aviso>
}
