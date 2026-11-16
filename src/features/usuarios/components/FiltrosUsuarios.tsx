import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, Search } from 'lucide-react'

import { Button, Input } from '@/shared/ui'
import { useAgencias } from '@/features/catalogos'
import { Campo } from '@/features/usuarios/components/Campo'
import { ariaCampo, campoClassName, selectClassName } from '@/features/usuarios/lib/campos'
import {
  BUSQUEDA_MAX_LENGTH,
  FILTROS_VACIOS,
  filtrosUsuariosSchema,
  type FiltrosUsuarios as Filtros,
  type FiltrosUsuariosInput,
} from '@/features/usuarios/lib/filtros'
import {
  etiquetaAgencia,
  OPCIONES_ESTADO,
  OPCIONES_ROL,
  OPCIONES_VINCULADO,
} from '@/features/usuarios/lib/formato'

interface FiltrosUsuariosProps {
  buscando: boolean
  /** Hay búsqueda o filtros aplicados en la tabla (muestra «Limpiar») */
  aplicados: boolean
  onBuscar: (filtros: Filtros) => void
  iniciales?: FiltrosUsuariosInput
}

/** Búsqueda libre (username, nombres, apellidos o correo) y filtros combinables de AUT-05 */
export function FiltrosUsuarios({ buscando, aplicados, onBuscar, iniciales = FILTROS_VACIOS }: FiltrosUsuariosProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FiltrosUsuariosInput, unknown, Filtros>({
    resolver: zodResolver(filtrosUsuariosSchema),
    defaultValues: iniciales,
  })
  const agencias = useAgencias()
  const errorBusqueda = errors.q?.message

  const limpiar = () => {
    reset(FILTROS_VACIOS)
    onBuscar(FILTROS_VACIOS)
  }

  return (
    <form onSubmit={handleSubmit(onBuscar)} noValidate role="search" aria-label="Buscar usuarios" className="flex flex-col gap-5">
      <Campo id="q" label="Buscar" error={errorBusqueda}>
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="q"
            type="search"
            autoComplete="off"
            maxLength={BUSQUEDA_MAX_LENGTH}
            placeholder="Username, nombres, apellidos o correo"
            className={`${campoClassName} pl-12`}
            {...ariaCampo('q', errorBusqueda)}
            {...register('q')}
          />
        </div>
      </Campo>

      <fieldset className="grid min-w-0 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <legend className="sr-only">Filtros</legend>
        <Campo id="filtro-rol" label="Rol">
          <select id="filtro-rol" className={selectClassName} {...register('rol')}>
            <option value="">Todos</option>
            {OPCIONES_ROL.map((opcion) => (
              <option key={opcion.value} value={opcion.value}>
                {opcion.label}
              </option>
            ))}
          </select>
        </Campo>

        <Campo id="filtro-estado" label="Estado">
          <select id="filtro-estado" className={selectClassName} {...register('estado')}>
            <option value="">Todos</option>
            {OPCIONES_ESTADO.map((opcion) => (
              <option key={opcion.value} value={opcion.value}>
                {opcion.label}
              </option>
            ))}
          </select>
        </Campo>

        <Campo
          id="filtro-agencia"
          label="Agencia"
          error={agencias.isError ? 'No pudimos cargar las agencias.' : undefined}
        >
          <select id="filtro-agencia" className={selectClassName} {...register('idAgencia')}>
            <option value="">{agencias.isLoading ? 'Cargando agencias…' : 'Todas'}</option>
            {agencias.data.map((agencia) => (
              <option key={agencia.idAgencia} value={agencia.idAgencia}>
                {etiquetaAgencia(agencia)}
              </option>
            ))}
          </select>
        </Campo>

        <Campo id="filtro-vinculado" label="Primer ingreso">
          <select id="filtro-vinculado" className={selectClassName} {...register('vinculado')}>
            <option value="">Todos</option>
            {OPCIONES_VINCULADO.map((opcion) => (
              <option key={opcion.value} value={opcion.value}>
                {opcion.label}
              </option>
            ))}
          </select>
        </Campo>
      </fieldset>

      <div className="flex flex-wrap justify-end gap-3">
        {aplicados && (
          <Button type="button" variant="outline" disabled={buscando} onClick={limpiar} className="h-[52px] rounded-xl px-6 text-base">
            Limpiar
          </Button>
        )}
        <Button type="submit" disabled={buscando} className="h-[52px] rounded-xl px-8 text-base font-semibold">
          {buscando ? <LoaderCircle className="animate-spin" /> : <Search />}
          Buscar
        </Button>
      </div>
    </form>
  )
}
