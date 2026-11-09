import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, Search } from 'lucide-react'

import { Button, Input, Label } from '@/shared/ui'
import { TIPO_TRANSACCION_MAX } from '@/features/cuenta/api/movimientos.contract'
import {
  filtrosMovimientosSchema,
  type FiltrosMovimientos as Filtros,
  type FiltrosMovimientosInput,
} from '@/features/cuenta/lib/movimientos'

/* Mismo estilo de campo que los demás filtros de cuentas */
const campoClassName =
  'h-[52px] rounded-xl border-border bg-field px-4 text-base md:text-base placeholder:text-muted-foreground/80 dark:bg-field dark:scheme-dark'

function Campo({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <Label htmlFor={id} className="text-[15px] font-semibold text-heading">
        {label}
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

interface FiltrosMovimientosProps {
  inicial: Filtros
  consultando: boolean
  onConsultar: (filtros: Filtros) => void
}

/** Rango de fechas (obligatorio) y tipo de transacción (texto libre, opcional) de CTA-06 */
export function FiltrosMovimientos({ inicial, consultando, onConsultar }: FiltrosMovimientosProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FiltrosMovimientosInput, unknown, Filtros>({
    resolver: zodResolver(filtrosMovimientosSchema),
    defaultValues: inicial,
  })
  const errorDesde = errors.desde?.message
  const errorHasta = errors.hasta?.message
  const errorTipo = errors.tipoTransaccion?.message

  return (
    <form
      onSubmit={handleSubmit(onConsultar)}
      noValidate
      aria-label="Filtros de movimientos"
      className="flex flex-col gap-5"
    >
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <Campo id="desde" label="Desde" error={errorDesde}>
          <Input
            id="desde"
            type="date"
            className={campoClassName}
            aria-invalid={!!errorDesde}
            aria-describedby={errorDesde ? 'desde-error' : undefined}
            {...register('desde')}
          />
        </Campo>

        <Campo id="hasta" label="Hasta" error={errorHasta}>
          <Input
            id="hasta"
            type="date"
            className={campoClassName}
            aria-invalid={!!errorHasta}
            aria-describedby={errorHasta ? 'hasta-error' : undefined}
            {...register('hasta')}
          />
        </Campo>

        <Campo id="tipoTransaccion" label="Tipo de transacción (opcional)" error={errorTipo}>
          <Input
            id="tipoTransaccion"
            autoComplete="off"
            maxLength={TIPO_TRANSACCION_MAX}
            placeholder="Todos los tipos"
            className={campoClassName}
            aria-invalid={!!errorTipo}
            aria-describedby={errorTipo ? 'tipoTransaccion-error' : undefined}
            {...register('tipoTransaccion')}
          />
        </Campo>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={consultando} className="h-[52px] rounded-xl px-8 text-base font-semibold">
          {consultando ? <LoaderCircle className="animate-spin" /> : <Search />}
          Consultar
        </Button>
      </div>
    </form>
  )
}
