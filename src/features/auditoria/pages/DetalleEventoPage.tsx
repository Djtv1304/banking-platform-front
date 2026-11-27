import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'

import { Button, ErrorApi } from '@/shared/ui'
import { obtenerEvento } from '@/features/auditoria/api/auditoria.api'
import { DetalleEvento } from '@/features/auditoria/components/DetalleEvento'

function leerIdEvento(param: string | undefined): number | null {
  return param && /^[1-9]\d{0,9}$/.test(param) ? Number(param) : null
}

export function DetalleEventoPage() {
  const { idEvento: param } = useParams()
  const idEvento = leerIdEvento(param)

  const consulta = useQuery({
    queryKey: ['auditoria', 'evento', idEvento],
    queryFn: () => obtenerEvento(idEvento ?? 0),
    enabled: idEvento !== null,
    gcTime: 0,
  })

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <Button asChild variant="ghost" size="lg" className="-ml-2.5 w-fit rounded-lg text-muted-foreground">
        <Link to="/auditoria">
          <ArrowLeft />
          Volver a la bitácora
        </Link>
      </Button>

      {idEvento === null ? (
        <p role="alert" className="text-sm text-destructive">Evento no válido.</p>
      ) : consulta.isPending ? (
        <p role="status" className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          Cargando evento…
        </p>
      ) : consulta.isError ? (
        <ErrorApi error={consulta.error} reintentar={() => void consulta.refetch()} />
      ) : (
        <DetalleEvento evento={consulta.data} />
      )}
    </div>
  )
}
