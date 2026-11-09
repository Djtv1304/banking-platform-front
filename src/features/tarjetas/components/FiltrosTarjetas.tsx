import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, Search } from 'lucide-react'

import { cn } from '@/shared/lib'
import { Button, Input, Label } from '@/shared/ui'
import { ESTADOS_TARJETA } from '@/features/tarjetas/api/tarjetas.contract'
import {
  FILTROS_VACIOS,
  filtrosTarjetasSchema,
  type FiltrosTarjetas as Filtros,
  type FiltrosTarjetasInput,
} from '@/features/tarjetas/lib/consulta'

/* Mismo estilo de campo que los demás formularios; el select es nativo */
const campoClassName =
  'h-[52px] rounded-xl border-border bg-field px-4 text-base md:text-base placeholder:text-muted-foreground/80 dark:bg-field'

const selectClassName = cn(
  campoClassName,
  'w-full border text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:scheme-dark',
)

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
      <Campo id={name} label={label} error={error}>
        <Input
          id={name}
          inputMode="numeric"
          autoComplete="off"
          placeholder="Ej. 125"
          className={campoClassName}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          {...register(name)}
        />
      </Campo>
    )
  }

  return (
    <form onSubmit={handleSubmit(onBuscar)} noValidate aria-label="Filtros de búsqueda" className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-3">
        {campoId('idCliente', 'ID del cliente')}
        {campoId('idCuenta', 'ID de la cuenta')}
        <Campo id="estado" label="Estado">
          <select id="estado" className={selectClassName} {...register('estado')}>
            <option value="">Todos</option>
            {ESTADOS_TARJETA.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
        </Campo>
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
