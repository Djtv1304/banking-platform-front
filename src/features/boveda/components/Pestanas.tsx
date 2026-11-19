import type { ComponentType, KeyboardEvent, ReactNode } from 'react'
import type { LucideProps } from 'lucide-react'

import { cn } from '@/shared/lib'

export interface Pestana<T extends string> {
  id: T
  texto: string
  Icono?: ComponentType<LucideProps>
  /** Número junto al texto (p. ej. solicitudes pendientes); se oculta si es 0 o no llega */
  contador?: number
}

interface PestanasProps<T extends string> {
  /** Prefijo de los ids de las pestañas y sus paneles */
  id: string
  etiqueta: string
  pestanas: Pestana<T>[]
  activa: T
  onCambiar: (id: T) => void
}

/** Pestañas segmentadas (patrón ARIA tabs): flechas para moverse, Inicio y Fin para los extremos */
export function Pestanas<T extends string>({ id, etiqueta, pestanas, activa, onCambiar }: PestanasProps<T>) {
  const mover = (event: KeyboardEvent<HTMLButtonElement>, indice: number) => {
    const destino =
      event.key === 'ArrowRight' ? (indice + 1) % pestanas.length
      : event.key === 'ArrowLeft' ? (indice - 1 + pestanas.length) % pestanas.length
      : event.key === 'Home' ? 0
      : event.key === 'End' ? pestanas.length - 1
      : null
    if (destino === null) return
    event.preventDefault()
    onCambiar(pestanas[destino].id)
    document.getElementById(`${id}-tab-${pestanas[destino].id}`)?.focus()
  }

  return (
    <div role="tablist" aria-label={etiqueta} className="inline-flex w-full max-w-full gap-1 overflow-x-auto rounded-2xl border border-border bg-field p-1 sm:w-fit">
      {pestanas.map(({ id: valor, texto, Icono, contador }, indice) => {
        const seleccionada = valor === activa
        return (
          <button
            key={valor}
            id={`${id}-tab-${valor}`}
            type="button"
            role="tab"
            aria-selected={seleccionada}
            aria-controls={`${id}-panel-${valor}`}
            tabIndex={seleccionada ? 0 : -1}
            onClick={() => onCambiar(valor)}
            onKeyDown={(event) => mover(event, indice)}
            className={cn(
              'flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
              seleccionada ? 'bg-card text-heading shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {Icono && <Icono aria-hidden className="size-4" />}
            {texto}
            {!!contador && (
              <span className="min-w-5 rounded-full bg-brand-navy-deep px-1.5 py-0.5 text-center text-xs leading-none font-bold text-white tabular-nums">
                {contador > 99 ? '99+' : contador}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Panel de una pestaña; solo se monta el activo */
export function PanelPestana({ id, valor, children }: { id: string; valor: string; children: ReactNode }) {
  return (
    <div role="tabpanel" id={`${id}-panel-${valor}`} aria-labelledby={`${id}-tab-${valor}`} tabIndex={0} className="outline-none">
      {children}
    </div>
  )
}
