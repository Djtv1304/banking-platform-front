import type { FechaContable } from '@/features/contabilidad/api/fecha-contable.contract'
import { toApiError } from '@/shared/api'
import { Aviso, Button, Cargando } from '@/shared/ui'
import { DatosFecha } from '@/features/contabilidad/components/DatosFecha'
import { mensajeErrorFechaContable } from '@/features/contabilidad/lib/fecha-contable'

/** Lo que usa el resultado de una consulta de TanStack Query, sin depender de su tipo completo */
export interface ConsultaFecha {
  isPending: boolean
  isError: boolean
  error?: Error | null
  data?: FechaContable
  refetch: () => unknown
}

/**
 * Resultado de «Consultar una fecha». Un 400 no se muestra aquí: va junto al campo de fecha.
 * Un 404 es el caso «fuera del calendario»: se explica, no es un fallo del sistema.
 */
export function ResultadoConsultaFecha({ consulta }: { consulta: ConsultaFecha }) {
  if (consulta.isError) {
    const error = toApiError(consulta.error)
    if (error.status === 400) return null
    return (
      <Aviso tono={error.status === 404 ? 'info' : 'error'}>
        {mensajeErrorFechaContable(error)}
        {error.status !== 404 && (
          <Button variant="outline" size="sm" onClick={() => consulta.refetch()} className="w-fit">
            Reintentar
          </Button>
        )}
      </Aviso>
    )
  }
  if (consulta.isPending) return <Cargando texto="Consultando la fecha…" />
  if (!consulta.data) return null
  return (
    <div className="rounded-xl border border-border bg-field p-5">
      <DatosFecha fecha={consulta.data} />
    </div>
  )
}
