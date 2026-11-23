import { CircleCheck, CircleDashed, CircleX } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { Aviso, Cargando } from '@/shared/ui'
import { useListaActivacion } from '@/features/organizacion/hooks/useProductosAdmin'

/** E3-06 · Lo que debe estar completo para activar el subproducto (el backend lo vuelve a exigir) */
export function ListaActivacion({ idSubProducto }: { idSubProducto: number }) {
  const lista = useListaActivacion(idSubProducto)
  if (lista.isPending) return <Cargando texto="Revisando la lista de activación…" />
  if (lista.isError) return <Aviso tono="error">{toApiError(lista.error).message}</Aviso>
  return (
    <section aria-label="Lista de activación" className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-heading">Lista de activación</h2>
      <p className="text-sm text-muted-foreground">
        {lista.data.completa ? 'Está completa: el subproducto se puede activar.' : 'Mientras falte algo, el subproducto no se puede activar.'}
      </p>
      <ul className="flex flex-col gap-2 text-sm text-heading">
        {lista.data.puntos.map((p) => (
          <li key={p.codigo} className="flex items-start gap-2">
            {p.cumple === true ? (
              <CircleCheck aria-label="Cumple" className="mt-0.5 size-4 shrink-0 text-primary" />
            ) : p.cumple === false ? (
              <CircleX aria-label="Falta" className="mt-0.5 size-4 shrink-0 text-destructive" />
            ) : (
              <CircleDashed aria-label="Pendiente" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            )}
            <span>
              {p.descripcion}
              {p.detalle && <span className="text-muted-foreground"> · {p.detalle}</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
