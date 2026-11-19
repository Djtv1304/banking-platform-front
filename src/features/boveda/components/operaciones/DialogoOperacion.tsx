import type { ReactNode } from 'react'

import { cn } from '@/shared/lib'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui'

interface DialogoOperacionProps {
  open: boolean
  /** Mientras se envía no se puede cerrar */
  ocupado: boolean
  onCerrar: () => void
  titulo: string
  descripcion: ReactNode
  /** Ancho: los formularios con denominaciones usan dos columnas */
  ancho?: 'normal' | 'amplio'
  /** Pie fijo con las acciones */
  pie: ReactNode
  children: ReactNode
}

/**
 * Marco común de las operaciones de bóveda: encabezado, cuerpo con scroll propio y pie fijo, para
 * que las acciones queden a la vista aunque la lista de denominaciones sea larga.
 */
export function DialogoOperacion({ open, ocupado, onCerrar, titulo, descripcion, ancho = 'normal', pie, children }: DialogoOperacionProps) {
  return (
    <Dialog open={open} onOpenChange={(abierto) => !abierto && !ocupado && onCerrar()}>
      <DialogContent
        showCloseButton={!ocupado}
        // Un clic fuera no descarta lo que se lleva contado
        onInteractOutside={(event) => event.preventDefault()}
        className={cn(
          'flex max-h-[calc(100svh-2rem)] flex-col gap-0 overflow-hidden rounded-3xl border border-border bg-card p-0',
          ancho === 'amplio' ? 'sm:max-w-5xl' : 'sm:max-w-lg',
        )}
      >
        <DialogHeader className="gap-2 border-b border-border px-6 pt-6 pb-5 sm:px-8 sm:pt-8">
          <DialogTitle className="pr-8 text-2xl font-bold tracking-tight text-heading">{titulo}</DialogTitle>
          <DialogDescription className="text-base">{descripcion}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">{children}</div>
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border bg-card px-6 py-5 sm:px-8">{pie}</div>
      </DialogContent>
    </Dialog>
  )
}

/** Error general de una operación dentro del diálogo */
export function ErrorOperacion({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
      {children}
    </p>
  )
}
