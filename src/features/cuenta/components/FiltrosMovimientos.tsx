import type { FormEvent, ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Button, FechaInput, Input, Label } from '@/shared/ui'
import { useBusquedaAutomatica } from '@/shared/lib/useBusquedaAutomatica'
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
    getValues,
    reset,
    control,
    formState: { errors },
  } = useForm<FiltrosMovimientosInput, unknown, Filtros>({
    resolver: zodResolver(filtrosMovimientosSchema),
    mode: 'onChange',
    defaultValues: inicial,
  })
  const consultar = () => {
    const resultado = filtrosMovimientosSchema.safeParse(getValues())
    if (resultado.success) onConsultar(resultado.data)
  }
  const busqueda = useBusquedaAutomatica(consultar)
  const errorTipo = errors.tipoTransaccion?.message

  const limpiar = () => {
    busqueda.cancelar()
    reset(inicial)
    onConsultar(inicial)
  }

  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    busqueda.cancelar()
    void handleSubmit(onConsultar)(evento)
  }

  return (
    <form
      onSubmit={enviar}
      {...busqueda.eventos}
      noValidate
      aria-label="Filtros de movimientos"
      className="flex flex-col gap-5"
    >
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {(['desde', 'hasta'] as const).map((campo) => (
          <div
            key={campo}
            className="flex min-w-0 flex-col gap-2.5"
            // FechaInput notifica también al completar el día al salir del campo.
            // La fecha se consulta aquí una sola vez, sin el temporizador del texto libre.
            onChange={(evento) => evento.stopPropagation()}
          >
            <Controller
              name={campo}
              control={control}
              render={({ field }) => (
                <FechaInput
                  id={campo}
                  label={campo === 'desde' ? 'Desde' : 'Hasta'}
                  value={field.value}
                  onChange={(valor) => {
                    field.onChange(valor)
                    busqueda.cancelar()
                    consultar()
                  }}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                  invalid={!!errors[campo]}
                  errorId={errors[campo] ? `${campo}-error` : undefined}
                  inputClassName={campoClassName}
                  required
                />
              )}
            />
            {errors[campo] && (
              <p id={`${campo}-error`} className="text-sm text-destructive">{errors[campo]?.message}</p>
            )}
          </div>
        ))}

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
        <Button type="button" variant="outline" onClick={limpiar} className="h-[52px] rounded-xl px-6 text-base">
          Limpiar
        </Button>
      </div>
      <p role="status" className="text-sm text-muted-foreground">
        {Object.keys(errors).length > 0
          ? 'Corrige los filtros indicados para actualizar los resultados.'
          : consultando
            ? 'Actualizando resultados…'
            : 'La lista se actualiza al dejar de escribir o cambiar un filtro. Enter busca inmediatamente.'}
      </p>
    </form>
  )
}
