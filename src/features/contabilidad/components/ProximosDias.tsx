import { toApiError } from '@/shared/api'
import { Badge } from '@/shared/ui'
import { useFechasContables } from '@/features/contabilidad/hooks/useFechaContable'
import {
  diasSiguientes,
  esFechaFueraDelCalendario,
  ETIQUETA_TIPO_DIA,
  formatearFechaCorta,
  tipoDia,
  VARIANTE_TIPO_DIA,
} from '@/features/contabilidad/lib/fecha-contable'

type Consulta = ReturnType<typeof useFechasContables>[number]

function EstadoDia({ consulta }: { consulta: Consulta }) {
  if (consulta.isError) {
    // Un 404 es justo el caso «sin calendario»; cualquier otro fallo no dice nada del día
    return esFechaFueraDelCalendario(toApiError(consulta.error))
      ? <Badge variant="outline">Sin calendario</Badge>
      : <span className="text-sm text-destructive">No se pudo consultar</span>
  }
  if (consulta.isPending) return <span className="text-sm text-muted-foreground">Consultando…</span>
  const tipo = tipoDia(consulta.data)
  return <Badge variant={VARIANTE_TIPO_DIA[tipo]}>{ETIQUETA_TIPO_DIA[tipo]}</Badge>
}

/** Los 7 días calendario que siguen a la fecha vigente, cada uno con su estado en el calendario */
export function ProximosDias({ desde }: { desde: string }) {
  const dias = diasSiguientes(desde, 7)
  const consultas = useFechasContables(dias)

  return (
    <section aria-labelledby="proximos-dias-titulo" className="rounded-3xl border border-border bg-card p-6 sm:p-8">
      <h2 id="proximos-dias-titulo" className="text-lg font-semibold text-heading">Próximos días</h2>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">Los 7 días siguientes a la fecha vigente y si se puede operar en ellos.</p>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {dias.map((dia, indice) => (
          <li key={dia} className="flex flex-col gap-2 rounded-xl border border-border bg-field px-4 py-3">
            <time dateTime={dia} className="text-sm font-medium text-heading">{formatearFechaCorta(dia)}</time>
            <div><EstadoDia consulta={consultas[indice]} /></div>
          </li>
        ))}
      </ol>
    </section>
  )
}
