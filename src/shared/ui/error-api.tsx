import { useState } from 'react'
import { Copy } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'

/**
 * Error de una consulta con su código de soporte (E0-13): el traceId del backend, que el usuario copia y soporte busca
 * en los registros (Backend/docs/inventario-registros.md). El detalle técnico nunca se muestra.
 */
export function ErrorApi({ error, reintentar }: { error: unknown; reintentar?: () => void }) {
  const normalizado = toApiError(error)
  const [copiado, setCopiado] = useState(false)

  async function copiar(codigo: string) {
    try {
      await navigator.clipboard.writeText(codigo)
      setCopiado(true)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <Aviso tono="error">
      <p>{normalizado.message}</p>
      {normalizado.traceId && (
        <p className="flex flex-wrap items-center gap-2 text-xs">
          Código de soporte: <code className="rounded bg-background/60 px-1.5 py-0.5 font-mono">{normalizado.traceId}</code>
          <button
            type="button"
            onClick={() => void copiar(normalizado.traceId as string)}
            className="inline-flex items-center gap-1 underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Copy aria-hidden className="size-3" />
            {copiado ? 'Copiado' : 'Copiar'}
          </button>
        </p>
      )}
      {reintentar && <Button variant="outline" onClick={reintentar}>Reintentar</Button>}
    </Aviso>
  )
}
