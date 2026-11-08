import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, Search } from 'lucide-react'

import { cn } from '@/shared/lib'
import { Button, Input, Label } from '@/shared/ui'
import { useAgencias } from '@/features/catalogos'
import {
  FILTROS_VACIOS,
  filtrosCuentasSchema,
  type FiltrosCuentas as Filtros,
  type FiltrosCuentasInput,
} from '@/features/cuenta/lib/filtros'
import { etiquetaAgencia, OPCIONES_ESTADO } from '@/features/cuenta/lib/formato'

/* Mismo estilo de campo que los formularios de clientes y tarjetas; los selects son nativos */
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

interface FiltrosCuentasProps {
  buscando: boolean
  onBuscar: (filtros: Filtros) => void
}

/** Filtros combinables de CTA-02; el cliente se busca por su identificación exacta (CLI-03) */
export function FiltrosCuentas({ buscando, onBuscar }: FiltrosCuentasProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FiltrosCuentasInput, unknown, Filtros>({
    resolver: zodResolver(filtrosCuentasSchema),
    defaultValues: FILTROS_VACIOS,
  })
  const agencias = useAgencias()
  const errorIdentificacion = errors.identificacion?.message

  return (
    <form onSubmit={handleSubmit(onBuscar)} noValidate aria-label="Filtros de búsqueda" className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Campo id="numeroCuenta" label="Número de cuenta">
          <Input
            id="numeroCuenta"
            autoComplete="off"
            placeholder="Número exacto"
            className={campoClassName}
            {...register('numeroCuenta')}
          />
        </Campo>

        <Campo id="identificacion" label="Cliente" error={errorIdentificacion}>
          <Input
            id="identificacion"
            inputMode="numeric"
            autoComplete="off"
            maxLength={13}
            placeholder="Cédula o RUC"
            className={campoClassName}
            aria-invalid={!!errorIdentificacion}
            aria-describedby={errorIdentificacion ? 'identificacion-error' : undefined}
            {...register('identificacion')}
          />
        </Campo>

        <Campo id="estado" label="Estado">
          <select id="estado" className={selectClassName} {...register('estado')}>
            <option value="">Todos</option>
            {OPCIONES_ESTADO.map((opcion) => (
              <option key={opcion.value} value={opcion.value}>
                {opcion.label}
              </option>
            ))}
          </select>
        </Campo>

        <Campo id="idAgencia" label="Agencia" error={agencias.isError ? 'No pudimos cargar las agencias.' : undefined}>
          <select id="idAgencia" className={selectClassName} {...register('idAgencia')}>
            <option value="">{agencias.isLoading ? 'Cargando agencias…' : 'Todas'}</option>
            {agencias.data.map((agencia) => (
              <option key={agencia.idAgencia} value={agencia.idAgencia}>
                {etiquetaAgencia(agencia)}
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
