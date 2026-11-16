import type { ReactNode } from 'react'

import { Label } from '@/shared/ui'

interface CampoProps {
  id: string
  label: string
  error?: string
  /** Texto de ayuda bajo el campo (se oculta cuando hay error) */
  ayuda?: ReactNode
  children: ReactNode
}

export function Campo({ id, label, error, ayuda, children }: CampoProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <Label htmlFor={id} className="text-[15px] font-semibold text-heading">
        {label}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        ayuda && (
          <p id={`${id}-ayuda`} className="text-sm text-muted-foreground">
            {ayuda}
          </p>
        )
      )}
    </div>
  )
}

