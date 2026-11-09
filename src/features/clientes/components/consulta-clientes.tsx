import { Button } from '@/shared/ui'

export function ErrorClientes({ error, reintentar }: { error: Error; reintentar?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-destructive">
      <p>{error.message}</p>
      {reintentar && <Button type="button" size="sm" variant="outline" onClick={reintentar}>Reintentar</Button>}
    </div>
  )
}

export function PaginacionClientes({ page, pageSize, total, cambiar }: {
  page: number
  pageSize: number
  total: number
  cambiar: (page: number) => void
}) {
  const paginas = Math.max(1, Math.ceil(total / pageSize))
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p aria-live="polite">Página {page} de {paginas} · {total} resultados</p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" disabled={page <= 1} onClick={() => cambiar(page - 1)}>Anterior</Button>
        <Button type="button" variant="outline" disabled={page >= paginas} onClick={() => cambiar(page + 1)}>Siguiente</Button>
      </div>
    </div>
  )
}
