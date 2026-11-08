/** Lista de pares etiqueta/valor; sin datos muestra un esqueleto de carga */
export function DatosLista({ datos }: { datos: { label: string; valor: string | null }[] | undefined }) {
  if (!datos) {
    return (
      <div aria-busy="true" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, indice) => (
          <span key={indice} className="flex flex-col gap-2">
            <span className="h-3 w-20 animate-pulse rounded bg-muted" />
            <span className="h-4 w-40 animate-pulse rounded bg-muted" />
          </span>
        ))}
      </div>
    )
  }

  return (
    <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
      {datos.map(({ label, valor }) => (
        <div key={label} className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
          <dd className="font-medium break-words text-heading">{valor || '—'}</dd>
        </div>
      ))}
    </dl>
  )
}
