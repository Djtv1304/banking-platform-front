import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, Search } from 'lucide-react'

import { Button, Input } from '@/shared/ui'
import { TIPOS_MOVIMIENTO } from '@/features/boveda/api/bovedas.contract'
import { Campo } from '@/features/boveda/components/Campo'
import { campoClassName, selectClassName } from '@/features/boveda/lib/campos'
import {
  FILTROS_MOVIMIENTOS_VACIOS,
  filtrosMovimientosSchema,
  type FiltrosMovimientos as Filtros,
} from '@/features/boveda/lib/filtros'
import { etiquetaMovimiento } from '@/features/boveda/lib/formato'

interface FiltrosMovimientosProps {
  consultando: boolean
  /** Hay filtros aplicados en la tabla (muestra «Limpiar») */
  aplicados: boolean
  onConsultar: (filtros: Filtros) => void
}

/** Tipo de movimiento y rango de fechas de BOV-03; todos opcionales */
export function FiltrosMovimientos({ consultando, aplicados, onConsultar }: FiltrosMovimientosProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Filtros>({ resolver: zodResolver(filtrosMovimientosSchema), defaultValues: FILTROS_MOVIMIENTOS_VACIOS })
  const errorDesde = errors.desde?.message
  const errorHasta = errors.hasta?.message

  const limpiar = () => {
    reset(FILTROS_MOVIMIENTOS_VACIOS)
    onConsultar(FILTROS_MOVIMIENTOS_VACIOS)
  }

  return (
    <form
      onSubmit={handleSubmit(onConsultar)}
      noValidate
      aria-label="Filtros de movimientos"
      className="grid items-start gap-5 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
    >
      <Campo id="mov-tipo" label="Tipo de movimiento">
        <select id="mov-tipo" className={selectClassName} {...register('tipoMovimiento')}>
          <option value="">Todos</option>
          {TIPOS_MOVIMIENTO.map((tipo) => (
            <option key={tipo} value={tipo}>
              {etiquetaMovimiento(tipo)}
            </option>
          ))}
        </select>
      </Campo>

      <Campo id="mov-desde" label="Desde" error={errorDesde}>
        <Input
          id="mov-desde"
          type="date"
          className={campoClassName}
          aria-invalid={!!errorDesde}
          aria-describedby={errorDesde ? 'mov-desde-error' : undefined}
          {...register('desde')}
        />
      </Campo>

      <Campo id="mov-hasta" label="Hasta" error={errorHasta}>
        <Input
          id="mov-hasta"
          type="date"
          className={campoClassName}
          aria-invalid={!!errorHasta}
          aria-describedby={errorHasta ? 'mov-hasta-error' : undefined}
          {...register('hasta')}
        />
      </Campo>

      {/* El margen superior alinea los botones con los campos, bajo la altura de las etiquetas */}
      <div className="flex gap-3 sm:col-span-2 sm:justify-end xl:col-span-1 xl:mt-[32px]">
        {aplicados && (
          <Button type="button" variant="outline" disabled={consultando} onClick={limpiar} className="h-[52px] rounded-xl px-5 text-base">
            Limpiar
          </Button>
        )}
        <Button type="submit" disabled={consultando} className="h-[52px] rounded-xl px-6 text-base font-semibold">
          {consultando ? <LoaderCircle className="animate-spin" /> : <Search />}
          Consultar
        </Button>
      </div>
    </form>
  )
}
