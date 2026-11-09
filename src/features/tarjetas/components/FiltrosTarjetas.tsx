import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, Search } from 'lucide-react'

import { cn } from '@/shared/lib'
import { Button, Input } from '@/shared/ui'
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
    formState: { errors },
  } = useForm<FiltrosTarjetasInput, unknown, Filtros>({
    resolver: zodResolver(filtrosTarjetasSchema),
    defaultValues: FILTROS_VACIOS,
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

  return (
    <form onSubmit={handleSubmit(onBuscar)} noValidate aria-label="Filtros de búsqueda" className="flex flex-col gap-5">
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

      <div className="flex justify-end">
        <Button type="submit" disabled={buscando} className="h-[52px] rounded-xl px-8 text-base font-semibold">
          {buscando ? <LoaderCircle className="animate-spin" /> : <Search />}
          Buscar
        </Button>
      </div>
    </form>
  )
}
