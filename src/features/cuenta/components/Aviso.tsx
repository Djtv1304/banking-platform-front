import type { ReactNode } from 'react'
import { CircleAlert, Info, LoaderCircle } from 'lucide-react'

import { cn } from '@/shared/lib'

/** Estados vacío y de error de las consultas de cuentas */
export function Aviso({ tono = 'info', children }: { tono?: 'info' | 'error'; children: ReactNode }) {
  const Icono = tono === 'error' ? CircleAlert : Info
  return (
    <div
      role={tono === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm',
        tono === 'error'
          ? 'border-destructive/40 bg-destructive/10 text-destructive'
          : 'border-border bg-field text-muted-foreground',
      )}
    >
      <Icono className="mt-0.5 size-4 shrink-0" />
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}

export function Cargando({ texto }: { texto: string }) {
  return (
    <p role="status" aria-busy="true" className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
      <LoaderCircle className="size-4 animate-spin" />
      {texto}
    </p>
  )
}
