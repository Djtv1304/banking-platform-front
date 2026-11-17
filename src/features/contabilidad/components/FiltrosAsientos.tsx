import { useState, type FormEvent, type ReactNode } from 'react'

import { cn } from '@/shared/lib'
import { Button, FechaInput, Label } from '@/shared/ui'
import { useAgencias } from '@/features/catalogos'
import { ESTADOS_ASIENTO, ORIGENES_ASIENTO } from '@/features/contabilidad/api/asientos.contract'
import {
  esFechaIsoValida,
  etiquetaAgencia,
  etiquetaEstadoAsiento,
  etiquetaOrigenAsiento,
  FILTROS_ASIENTOS_VACIOS,
  type FiltrosAsientos as Filtros,
} from '@/features/contabilidad/lib/asientos'

/* Mismo estilo de campo que los demás filtros; los selects son nativos */
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

interface FiltrosAsientosProps {
  consultando: boolean
  onConsultar: (filtros: Filtros) => void
}

/** Filtros combinables de CON-04: se aplican al cambiar, con fecha válida. */
export function FiltrosAsientos({ consultando, onConsultar }: FiltrosAsientosProps) {
  const [borrador, setBorrador] = useState<Filtros>(FILTROS_ASIENTOS_VACIOS)
  const [errorFecha, setErrorFecha] = useState<string>()
  const agencias = useAgencias()

  const consultar = (filtros: Filtros) => {
    if (filtros.fecha && !esFechaIsoValida(filtros.fecha)) {
      setErrorFecha('Escribe una fecha válida: día, mes y año.')
      return
    }
    setErrorFecha(undefined)
    onConsultar(filtros)
  }

  const cambiar = (campo: keyof Filtros) => (valor: string) => {
    const siguientes = { ...borrador, [campo]: valor }
    setBorrador(siguientes)
    consultar(siguientes)
  }

  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    consultar(borrador)
  }

  const limpiar = () => {
    setBorrador(FILTROS_ASIENTOS_VACIOS)
    setErrorFecha(undefined)
    onConsultar(FILTROS_ASIENTOS_VACIOS)
  }

  return (
    <form onSubmit={enviar} noValidate aria-label="Filtros de asientos" className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-2.5 sm:col-span-2 lg:col-span-3">
          <FechaInput
            id="fecha-asiento"
            label="Fecha del asiento"
            value={borrador.fecha}
            onChange={cambiar('fecha')}
            onBlur={() => {}}
            inputClassName={campoClassName}
            invalid={!!errorFecha}
            errorId={errorFecha ? 'fecha-asiento-error' : undefined}
          />
          {errorFecha && <p id="fecha-asiento-error" className="text-sm text-destructive">{errorFecha}</p>}
        </div>

        <Campo id="agencia-asiento" label="Agencia" error={agencias.isError ? 'No pudimos cargar las agencias.' : undefined}>
          <select
            id="agencia-asiento"
            className={selectClassName}
            value={borrador.idAgencia}
            onChange={(evento) => cambiar('idAgencia')(evento.target.value)}
          >
            <option value="">{agencias.isLoading ? 'Cargando agencias…' : 'Todas'}</option>
            {agencias.data.map((agencia) => (
              <option key={agencia.idAgencia} value={agencia.idAgencia}>
                {etiquetaAgencia(agencia)}
              </option>
            ))}
          </select>
        </Campo>

        <Campo id="origen-asiento" label="Origen">
          <select
            id="origen-asiento"
            className={selectClassName}
            value={borrador.origen}
            onChange={(evento) => cambiar('origen')(evento.target.value)}
          >
            <option value="">Todos</option>
            {ORIGENES_ASIENTO.map((origen) => (
              <option key={origen} value={origen}>
                {etiquetaOrigenAsiento(origen)}
              </option>
            ))}
          </select>
        </Campo>

        <Campo id="estado-asiento" label="Estado">
          <select
            id="estado-asiento"
            className={selectClassName}
            value={borrador.estado}
            onChange={(evento) => cambiar('estado')(evento.target.value)}
          >
            <option value="">Todos</option>
            {ESTADOS_ASIENTO.map((estado) => (
              <option key={estado} value={estado}>
                {etiquetaEstadoAsiento(estado)}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="outline" onClick={limpiar} className="h-[52px] rounded-xl px-6 text-base">
          Limpiar filtros
        </Button>
      </div>
      <p role="status" className="text-sm text-muted-foreground">
        {consultando ? 'Actualizando resultados…' : 'La lista se actualiza al cambiar un filtro.'}
      </p>
    </form>
  )
}
