import type { ReactNode, Ref } from 'react'
import { cn } from '@/shared/lib'
import { completarDia, fechaDesdePartes, partesDeFecha, type PartesFecha } from '@/shared/lib/fecha-partes'
import { Input } from '@/shared/ui/input'

const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

interface Props {
  id: string
  label: string
  value: string
  onChange: (valor: string) => void
  onBlur: () => void
  inputRef?: Ref<HTMLInputElement>
  invalid?: boolean
  errorId?: string
  required?: boolean
  inputClassName?: string
  autoComplete?: 'bday'
  accion?: ReactNode
}

/** Fecha histórica conocida: día, mes y año explícitos, sin depender del locale del navegador. */
export function FechaInput({ id, label, value, onChange, onBlur, inputRef, invalid, errorId, required, inputClassName, autoComplete, accion }: Props) {
  const partes = partesDeFecha(value)
  const hintId = `${id}-formato`
  const descripcion = [hintId, errorId].filter(Boolean).join(' ')
  const cambiar = (campo: keyof PartesFecha, texto: string) => onChange(fechaDesdePartes({ ...partes, [campo]: texto }))
  const campoClase = cn('min-w-0', inputClassName)

  return (
    <fieldset className="min-w-0" aria-describedby={descripcion}>
      <legend className="mb-2.5 text-[15px] font-semibold text-heading">{label}</legend>
      <div className={accion ? 'flex flex-wrap items-end gap-3' : 'contents'}>
        <div className={cn('flex max-w-lg flex-wrap gap-2', accion && 'w-full sm:flex-1 sm:basis-80')}>
          <div className="flex min-w-16 flex-1 flex-col gap-1.5">
            <label htmlFor={id} className="text-sm text-muted-foreground">Día</label>
            <Input
              id={id} ref={inputRef} name={`${id}-dia`} type="text" inputMode="numeric"
              autoComplete={autoComplete ? 'bday-day' : undefined}
              maxLength={2} placeholder="DD" value={partes.dia} className={campoClase}
              aria-invalid={invalid} aria-required={required} aria-describedby={descripcion}
              onChange={event => cambiar('dia', event.target.value)}
              onBlur={() => { onChange(fechaDesdePartes(completarDia(partes))); onBlur() }}
            />
          </div>
          <div className="flex min-w-32 flex-[2] flex-col gap-1.5">
            <label htmlFor={`${id}-mes`} className="text-sm text-muted-foreground">Mes</label>
            <select
              id={`${id}-mes`} name={`${id}-mes`} value={partes.mes}
              autoComplete={autoComplete ? 'bday-month' : undefined}
              className={cn(campoClase, 'w-full rounded-xl border border-border bg-field px-2 text-base text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:scheme-dark', invalid && 'border-destructive')}
              aria-invalid={invalid} aria-required={required} aria-describedby={descripcion}
              onChange={event => cambiar('mes', event.target.value)} onBlur={onBlur}
            >
              <option value="">Mes</option>
              {meses.map((mes, index) => {
                const numero = String(index + 1).padStart(2, '0')
                return <option key={numero} value={numero}>{numero} · {mes}</option>
              })}
            </select>
          </div>
          <div className="flex min-w-24 flex-[1.5] flex-col gap-1.5">
            <label htmlFor={`${id}-anio`} className="text-sm text-muted-foreground">Año</label>
            <Input
              id={`${id}-anio`} name={`${id}-anio`} type="text" inputMode="numeric"
              autoComplete={autoComplete ? 'bday-year' : undefined}
              maxLength={4} placeholder="AAAA" value={partes.anio} className={campoClase}
              aria-invalid={invalid} aria-required={required} aria-describedby={descripcion}
              onChange={event => cambiar('anio', event.target.value)} onBlur={onBlur}
            />
          </div>
        </div>
        {accion}
      </div>
      <p id={hintId} className="mt-2 text-xs text-muted-foreground">Día/mes/año. Escribe el año con 4 dígitos, por ejemplo: 15/01/2000.</p>
    </fieldset>
  )
}
