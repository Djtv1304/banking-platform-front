import { toApiError } from '@/shared/api'
import { Aviso, Button, Cargando } from '@/shared/ui'
import { FechaVigente } from '@/features/contabilidad/components/FechaVigente'
import { ProximosDias } from '@/features/contabilidad/components/ProximosDias'
import { useFechaContableActual } from '@/features/contabilidad/hooks/useFechaContable'
import { mensajeErrorFechaContable } from '@/features/contabilidad/lib/fecha-contable'

/** E4-05 · Fecha contable vigente y estado de los próximos días (solo consulta) */
export function FechaContablePage() {
  const actual = useFechaContableActual()

  const contenido = (() => {
    if (actual.isError) {
      return (
        <Aviso tono="error">
          {mensajeErrorFechaContable(toApiError(actual.error))}
          <Button variant="outline" size="sm" onClick={() => actual.refetch()} className="w-fit">
            Reintentar
          </Button>
        </Aviso>
      )
    }
    if (actual.isPending) return <Cargando texto="Consultando la fecha contable…" />
    return (
      <>
        <FechaVigente fecha={actual.data} />
        <ProximosDias desde={actual.data.fecha} />
      </>
    )
  })()

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header>
        <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">Fecha contable</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Consulta con qué fecha se registran hoy las operaciones y qué días del calendario se puede operar.
          Tienes acceso de solo consulta.
        </p>
      </header>
      {contenido}
    </div>
  )
}
