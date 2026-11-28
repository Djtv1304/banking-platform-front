import type { ReactNode } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'

import { cn } from '@/shared/lib'
import { a11y } from '@/features/clientes/lib/a11y'
import { Button, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui'

/* Piezas comunes de los pasos del registro (mismo estilo que el formulario original) */

export const fieldClassName =
  'h-[52px] rounded-xl border-border bg-field px-4 text-base md:text-base placeholder:text-muted-foreground/80 dark:bg-field'

const selectClassName =
  'w-full rounded-xl border-border bg-field px-4 text-base data-[size=default]:h-[52px] dark:bg-field dark:hover:bg-field'

interface FieldProps {
  id: string
  label: string
  error?: string
  optional?: boolean
  className?: string
  children: ReactNode
}

export function Field({ id, label, error, optional, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      <Label htmlFor={id} className="text-[15px] font-semibold text-heading">
        {label}
        {optional && <span className="font-normal text-muted-foreground">(opcional)</span>}
      </Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

interface SelectFieldProps {
  id: string
  name?: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  options: readonly { value: string; label: string }[]
  placeholder: string
  error?: string
  disabled?: boolean
  required?: boolean
  descriptionId?: string
}

export function SelectField({ id, name, value, onChange, onBlur, options, placeholder, error, disabled, required, descriptionId }: SelectFieldProps) {
  const describedBy = [error ? `${id}-error` : undefined, descriptionId].filter(Boolean).join(' ') || undefined
  return (
    <Select name={name} value={value} onValueChange={onChange} disabled={disabled} required={required}>
      <SelectTrigger id={id} onBlur={onBlur} className={selectClassName} {...a11y(id, error)} aria-describedby={describedBy}>
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

/** Título de un bloque dentro de un paso */
export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-1 border-b border-border pb-3">
        <h2 className="text-lg font-semibold text-heading">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </header>
      {children}
    </section>
  )
}

interface StepActionsProps {
  submitLabel: string
  onBack?: () => void
  submitting?: boolean
}

export function StepActions({ submitLabel, onBack, submitting }: StepActionsProps) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between">
      {onBack ? (
        <Button type="button" variant="outline" onClick={onBack} className="h-[52px] rounded-xl px-6 text-base">
          <ArrowLeft />
          Atrás
        </Button>
      ) : (
        <span aria-hidden />
      )}
      <Button
        type="submit"
        disabled={submitting}
        className="h-[52px] rounded-xl px-8 text-base font-semibold hover:bg-primary/90"
      >
        {submitLabel}
        <ArrowRight />
      </Button>
    </div>
  )
}
