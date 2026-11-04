import { Check } from 'lucide-react'

import { cn } from '@/shared/lib'

export interface Paso {
  titulo: string
  descripcion: string
}

interface RegistroStepperProps {
  pasos: readonly Paso[]
  /** Paso actual (índice). Igual a pasos.length cuando el registro terminó */
  actual: number
  /** Pasos a los que se puede volver con un clic (ya visitados) */
  alcanzado: number
  onSelect: (indice: number) => void
}

export function RegistroStepper({ pasos, actual, alcanzado, onSelect }: RegistroStepperProps) {
  const terminado = actual >= pasos.length

  return (
    <nav aria-label="Progreso del registro" className="flex flex-col gap-3">
      <ol className="flex items-start">
        {pasos.map((paso, indice) => {
          const completo = indice < actual
          const enCurso = indice === actual
          const navegable = !terminado && indice !== actual && indice <= alcanzado
          const ultimo = indice === pasos.length - 1

          return (
            <li key={paso.titulo} className={cn('flex items-start', !ultimo && 'flex-1')}>
              <button
                type="button"
                disabled={!navegable}
                onClick={() => onSelect(indice)}
                aria-current={enCurso ? 'step' : undefined}
                className="group flex shrink-0 items-start gap-3 rounded-xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 enabled:cursor-pointer"
              >
                <span
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                    completo && 'bg-primary text-primary-foreground group-enabled:group-hover:bg-primary/85',
                    enCurso && 'border-2 border-primary bg-card text-heading ring-4 ring-primary/15',
                    !completo && !enCurso && 'border border-border bg-card text-muted-foreground',
                  )}
                >
                  {completo ? <Check className="size-5" strokeWidth={2.5} /> : indice + 1}
                  <span className="sr-only">{completo ? ' (completado)' : enCurso ? ' (en curso)' : ' (pendiente)'}</span>
                </span>
                <span className={cn('hidden flex-col pt-0.5 md:flex', !enCurso && 'max-lg:hidden')}>
                  <span
                    className={cn(
                      'text-sm font-semibold whitespace-nowrap',
                      enCurso || completo ? 'text-heading' : 'text-muted-foreground',
                    )}
                  >
                    {paso.titulo}
                  </span>
                  <span className="text-xs whitespace-nowrap text-muted-foreground">{paso.descripcion}</span>
                </span>
              </button>

              {!ultimo && (
                <span aria-hidden className="mx-3 mt-5 h-0.5 flex-1 overflow-hidden rounded-full bg-border lg:mx-4">
                  <span
                    className="block h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                    style={{ width: completo ? '100%' : '0%' }}
                  />
                </span>
              )}
            </li>
          )
        })}
      </ol>

      {/* En pantallas pequeñas solo se ven los números: el título del paso actual va aquí */}
      {!terminado && (
        <p className="text-sm text-muted-foreground md:hidden">
          Paso {actual + 1} de {pasos.length} ·{' '}
          <span className="font-semibold text-heading">{pasos[actual].titulo}</span>
        </p>
      )}
    </nav>
  )
}
