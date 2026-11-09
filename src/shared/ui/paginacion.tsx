import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/shared/ui/button'

interface PaginacionProps {
  resumen: string
  page: number
  totalPaginas: number
  /** Deshabilita los botones mientras llega la página */
  ocupado: boolean
  onCambiar: (page: number) => void
}

/** Resumen y botones Anterior/Siguiente bajo una tabla paginada */
export function Paginacion({ resumen, page, totalPaginas, ocupado, onCambiar }: PaginacionProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {resumen}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="lg"
          disabled={page <= 1 || ocupado}
          onClick={() => onCambiar(page - 1)}
          className="rounded-lg px-4"
        >
          <ChevronLeft />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="lg"
          disabled={page >= totalPaginas || ocupado}
          onClick={() => onCambiar(page + 1)}
          className="rounded-lg px-4"
        >
          Siguiente
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}
