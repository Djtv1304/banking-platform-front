import type { ReactNode } from 'react'

import { cn } from '@/shared/lib'

/** Tarjeta de la ficha: título, acción opcional a la derecha y contenido */
export function Bloque({
  id,
  titulo,
  accion,
  className,
  children,
}: {
  id: string
  titulo: string
  accion?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id} className={cn('flex flex-col gap-6 rounded-3xl border border-border bg-card p-6 sm:p-8', className)}>
      <header className="flex min-h-9 flex-wrap items-center justify-between gap-3">
        <h2 id={id} className="text-lg font-semibold text-heading">
          {titulo}
        </h2>
        {accion}
      </header>
      {children}
    </section>
  )
}

export function Dato({ label, children, nota }: { label: string; children: ReactNode; nota?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium break-words text-heading">{children}</dd>
      {nota && <dd className="text-sm text-muted-foreground">{nota}</dd>}
    </div>
  )
}

/** Clases comunes de los diálogos de la ficha */
export const dialogoClassName =
  'max-h-[calc(100svh-2rem)] gap-6 overflow-y-auto rounded-3xl border border-border bg-card p-6 sm:max-w-lg sm:p-8'

/** Error de una acción dentro de un diálogo o formulario */
export function ErrorAccion({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
      {children}
    </p>
  )
}
