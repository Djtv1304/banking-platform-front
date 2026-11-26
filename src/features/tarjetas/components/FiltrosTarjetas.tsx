import type { FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { cn } from '@/shared/lib'
import { Button, Input } from '@/shared/ui'
import { useBusquedaAutomatica } from '@/shared/lib/useBusquedaAutomatica'
import { ESTADOS_TARJETA } from '@/features/tarjetas/api/tarjetas.contract'
import { Field, fieldClassName } from '@/features/tarjetas/components/form-fields'
import {
  FILTROS_VACIOS,
  filtrosTarjetasSchema,
  type FiltrosTarjetas as Filtros,
  type FiltrosTarjetasInput,
} from '@/features/tarjetas/lib/consulta'

/* Mismo estilo de campo que los demás formularios; el select es nativo */
const selectClassName = cn(
  fieldClassName,
  'w-full border text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:scheme-dark',
)

interface FiltrosTarjetasProps {
  buscando: boolean
  onBuscar: (filtros: Filtros) => void
}

/** Filtros combinables de TAR-02: cliente y cuenta por su ID, y estado */
export function FiltrosTarjetas({ buscando, onBuscar }: FiltrosTarjetasProps) {
  const {
    register,
    handleSubmit,
    getValues,
    reset,
    formState: { errors },
  } = useForm<FiltrosTarjetasInput, unknown, Filtros>({
    resolver: zodResolver(filtrosTarjetasSchema),
    mode: 'onChange',
    defaultValues: FILTROS_VACIOS,
  })
  const busqueda = useBusquedaAutomatica(() => {
    const resultado = filtrosTarjetasSchema.safeParse(getValues())
    if (resultado.success) onBuscar(resultado.data)
  })

  const campoId = (name: 'idCliente' | 'idCuenta', label: string) => {
    const error = errors[name]?.message
    return (
      <Field id={name} label={label} error={error}>
        <Input
          id={name}
          inputMode="numeric"
          autoComplete="off"
          placeholder="Ej. 125"
          className={fieldClassName}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          {...register(name)}
        />
      </Field>
    )
  }

  const limpiar = () => {
    busqueda.cancelar()
    reset(FILTROS_VACIOS)
    onBuscar(FILTROS_VACIOS)
  }

  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    busqueda.cancelar()
    void handleSubmit(onBuscar)(evento)
  }

  return (
    <form
      onSubmit={enviar}
      {...busqueda.eventos}
      noValidate
      role="search"
      aria-label="Filtros de búsqueda"
      className="flex flex-col gap-5"
    >
      <div className="grid gap-5 sm:grid-cols-3">
        {campoId('idCliente', 'ID del cliente')}
        {campoId('idCuenta', 'ID de la cuenta')}
        <Field id="estado" label="Estado">
          <select id="estado" className={selectClassName} {...register('estado')}>
            <option value="">Todos</option>
            {ESTADOS_TARJETA.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={limpiar} className="h-[52px] rounded-xl px-6 text-base">
          Limpiar
        </Button>
      </div>
      <p role="status" className="text-sm text-muted-foreground">
        {Object.keys(errors).length > 0
          ? 'Corrige los filtros indicados para actualizar los resultados.'
          : buscando
            ? 'Actualizando resultados…'
            : 'La lista se actualiza al dejar de escribir o cambiar un filtro. Enter busca inmediatamente.'}
      </p>
    </form>
  )
}
