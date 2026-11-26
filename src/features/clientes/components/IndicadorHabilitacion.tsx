import { useQuery } from '@tanstack/react-query'
import { CircleCheck, CircleX } from 'lucide-react'

import { Button } from '@/shared/ui'
import { consultarHabilitacion, habilitacionKey, motivoHabilitacion } from '@/features/clientes/api/habilitacion'

/** E5-05 · Si el cliente puede recibir productos (cuentas, tarjetas, créditos) y qué le falta */
export function IndicadorHabilitacion({ idCliente }: { idCliente: number }) {
  const consulta = useQuery({
    queryKey: habilitacionKey(idCliente),
    queryFn: ({ signal }) => consultarHabilitacion(idCliente, signal),
    retry: false,
  })

  if (consulta.isPending) return <p role="status" className="text-sm text-muted-foreground">Verificando si puede recibir productos…</p>
  if (consulta.isError) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-destructive">
        <p>No pudimos verificar si el cliente puede recibir productos.</p>
        <Button type="button" size="sm" variant="outline" onClick={() => void consulta.refetch()}>Reintentar</Button>
      </div>
    )
  }

  const motivos = consulta.data.motivos.map(motivoHabilitacion).filter((motivo): motivo is string => motivo !== null)
  return consulta.data.habilitado ? (
    <p role="status" className="flex items-center gap-2 font-semibold text-heading">
      <CircleCheck aria-hidden className="size-5 text-link" />
      Puede recibir productos
    </p>
  ) : (
    <div role="status" className="flex flex-col gap-2">
      <p className="flex items-center gap-2 font-semibold text-destructive">
        <CircleX aria-hidden className="size-5" />
        No puede recibir productos
      </p>
      {motivos.length > 0 && (
        <ul className="list-disc pl-6 text-sm text-foreground">
          {[...new Set(motivos)].map((motivo) => <li key={motivo}>{motivo}</li>)}
        </ul>
      )}
    </div>
  )
}
