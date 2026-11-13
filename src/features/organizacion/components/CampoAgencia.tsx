import type { ReactNode } from 'react'

import { Label } from '@/shared/ui'

export const inputClassName =
  'h-11 rounded-xl border-border bg-field px-3 text-base md:text-base dark:bg-field dark:scheme-dark'

export const selectClassName =
  'w-full rounded-xl border-border bg-field px-3 text-base data-[size=default]:h-11 dark:bg-field dark:hover:bg-field'

interface CampoAgenciaProps {
  id: string
  label: string
  error?: string
  ayuda?: string
  children: ReactNode
}

/** Etiqueta, control y, debajo, el error o el texto de ayuda */
export function CampoAgencia({ id, label, error, ayuda, children }: CampoAgenciaProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-sm font-semibold text-heading">
        {label}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        ayuda && (
          <p id={`${id}-ayuda`} className="text-xs text-muted-foreground">
            {ayuda}
          </p>
        )
      )}
    </div>
  )
}
