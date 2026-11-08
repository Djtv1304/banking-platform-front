import type { ReactNode } from 'react'

import { cn } from '@/shared/lib'
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui'
import { a11y } from '@/features/tarjetas/lib/formulario'

/*
 * Piezas del formulario con el mismo estilo que el registro de clientes. Viven aquí porque una
 * feature no puede importar internos de otra; si se repiten en un tercer formulario, conviene
 * moverlas a shared/ui.
 */

export const fieldClassName =
  'h-[52px] rounded-xl border-border bg-field px-4 text-base md:text-base placeholder:text-muted-foreground/80 dark:bg-field'

const selectClassName =
  'w-full rounded-xl border-border bg-field px-4 text-base data-[size=default]:h-[52px] dark:bg-field dark:hover:bg-field'

interface FieldProps {
  id: string
  label: string
  error?: string
  hint?: string
  className?: string
  children: ReactNode
}

export function Field({ id, label, error, hint, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      <Label htmlFor={id} className="text-[15px] font-semibold text-heading">
        {label}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        hint && <p className="text-sm text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}

export function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null
  return (
    <p id={`${id}-error`} className="text-sm text-destructive">
      {error}
    </p>
  )
}

interface SelectFieldProps {
  id: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  options: readonly { value: string; label: string }[]
  placeholder: string
  error?: string
  disabled?: boolean
}

export function SelectField({ id, value, onChange, onBlur, options, placeholder, error, disabled }: SelectFieldProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} onBlur={onBlur} className={selectClassName} {...a11y(id, error)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

interface FormSectionProps {
  numero: number
  title: string
  description?: string
  children: ReactNode
}

/** Bloque numerado: el formulario se completa de arriba abajo */
export function FormSection({ numero, title, description, children }: FormSectionProps) {
  return (
    <section className="flex flex-col gap-5">
      <header className="flex items-start gap-3 border-b border-border pb-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {numero}
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-heading">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </header>
      {children}
    </section>
  )
}
