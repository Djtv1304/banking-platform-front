import { Button } from '@/shared/ui'

interface EstadoCatalogoProps {
  id: string
  nombre: string
  consulta: {
    data: readonly unknown[]
    isFetching: boolean
    isError: boolean
    refetch: () => Promise<unknown>
  }
}

export function EstadoCatalogo({ id, nombre, consulta }: EstadoCatalogoProps) {
  if (consulta.isFetching && !consulta.data.length) {
    return <p id={id} role="status" className="text-sm text-muted-foreground">Cargando {nombre}…</p>
  }
  if (consulta.isError) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <p id={id} role="alert" className="text-sm text-destructive">No pudimos cargar {nombre}.</p>
        <Button type="button" variant="outline" size="sm" aria-label={`Reintentar ${nombre}`}
          onClick={() => void consulta.refetch()}>
          Reintentar
        </Button>
      </div>
    )
  }
  if (!consulta.data.length) {
    return <p id={id} role="status" className="text-sm text-muted-foreground">No hay {nombre} disponibles.</p>
  }
  return <span id={id} className="sr-only">Catálogo de {nombre} cargado.</span>
}
