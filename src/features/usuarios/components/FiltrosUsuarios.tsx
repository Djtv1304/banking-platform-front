import type { FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Search } from 'lucide-react'

import { Button, Input } from '@/shared/ui'
import { useBusquedaAutomatica } from '@/shared/lib/useBusquedaAutomatica'
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
    getValues,
    reset,
    formState: { errors, isDirty },
  } = useForm<FiltrosUsuariosInput, unknown, Filtros>({
    resolver: zodResolver(filtrosUsuariosSchema),
    mode: 'onChange',
    defaultValues: iniciales,
  })
  const busqueda = useBusquedaAutomatica(() => {
    const resultado = filtrosUsuariosSchema.safeParse(getValues())
    if (resultado.success) onBuscar(resultado.data)
  })
  const agencias = useAgencias()
  const errorBusqueda = errors.q?.message

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
      aria-label="Buscar usuarios"
      className="flex flex-col gap-5"
    >
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
        <Campo id="filtro-nombre" label="Nombre" error={errors.nombre?.message}>
          <Input id="filtro-nombre" type="search" maxLength={BUSQUEDA_MAX_LENGTH} {...ariaCampo('filtro-nombre', errors.nombre?.message)} {...register('nombre')} />
        </Campo>
        <Campo id="filtro-id-usuario" label="ID de usuario" error={errors.idUsuario?.message}>
          <Input id="filtro-id-usuario" inputMode="numeric" maxLength={10} {...ariaCampo('filtro-id-usuario', errors.idUsuario?.message)} {...register('idUsuario')} />
        </Campo>
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
        {(aplicados || isDirty) && (
          <Button type="button" variant="outline" onClick={limpiar} className="h-[52px] rounded-xl px-6 text-base">
            Limpiar
          </Button>
        )}
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
