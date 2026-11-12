import { toApiError } from '@/shared/api'
import { Aviso, Cargando } from '@/shared/ui'
import { useAgencias, type Agencia } from '@/features/catalogos'
import { EstadoAgenciaBadge } from '@/features/organizacion/components/EstadoAgenciaBadge'

/** ORG-01/ORG-02 · Administración de agencias (solo ADMIN). La lista es el catálogo CAT-06 */
export function AgenciasPage() {
  const agencias = useAgencias()

  const contenido = (() => {
    if (agencias.isError) return <Aviso tono="error">{toApiError(agencias.error).message}</Aviso>
    if (agencias.isPending) return <Cargando texto="Cargando agencias…" />
    if (agencias.data.length === 0) return <Aviso>Todavía no hay agencias registradas.</Aviso>
    return <TablaAgencias agencias={agencias.data} />
  })()

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header>
        <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">Agencias</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Matriz y sucursales de la cooperativa. Crea agencias, corrige sus datos o cambia su estado.
        </p>
      </header>

      <section aria-label="Agencias" className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        {contenido}
      </section>
    </div>
  )
}

function TablaAgencias({ agencias }: { agencias: Agencia[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-border text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-3 font-medium">
              Código
            </th>
            <th scope="col" className="px-3 py-3 font-medium">
              Tipo
            </th>
            <th scope="col" className="px-3 py-3 font-medium">
              Ciudad
            </th>
            <th scope="col" className="px-3 py-3 font-medium">
              Estado
            </th>
          </tr>
        </thead>
        <tbody>
          {agencias.map((agencia) => (
            <tr key={agencia.idAgencia} className="border-b border-border">
              <td className="px-3 py-3">
                <span className="block font-semibold text-heading">{agencia.codigo}</span>
                <span className="text-xs text-muted-foreground">ID {agencia.idAgencia}</span>
              </td>
              <td className="px-3 py-3 text-heading">{agencia.tipoAgencia}</td>
              <td className="px-3 py-3">
                <span className="block text-heading">{agencia.ciudad}</span>
                <span className="text-xs text-muted-foreground">{agencia.provincia}</span>
              </td>
              <td className="px-3 py-3">
                <EstadoAgenciaBadge estado={agencia.estado} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
