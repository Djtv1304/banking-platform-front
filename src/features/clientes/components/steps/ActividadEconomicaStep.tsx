import { useState } from 'react'
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form'
import { BriefcaseBusiness, CircleCheck, Search } from 'lucide-react'

import { cn } from '@/shared/lib'
import { Checkbox, Input, Label } from '@/shared/ui'
import { useActividadesEconomicas } from '@/features/catalogos'
import { a11y } from '@/features/clientes/lib/a11y'
import { EstadoCatalogo } from '@/features/clientes/components/EstadoCatalogo'
import { fieldClassName, FormSection, StepActions } from '@/features/clientes/components/form-fields'
import type { ActividadData, ActividadInput } from '@/features/clientes/schemas/registro-cliente.schema'

const TODAS = 'Todas'

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

interface ActividadEconomicaStepProps {
  form: UseFormReturn<ActividadInput, unknown, ActividadData>
  onBack: () => void
  onSubmit: (actividad: ActividadData) => void
}

export function ActividadEconomicaStep({ form, onBack, onSubmit }: ActividadEconomicaStepProps) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form
  const [busqueda, setBusqueda] = useState('')
  const [area, setArea] = useState(TODAS)

  const consultaActividades = useActividadesEconomicas()
  const { data: actividades } = consultaActividades
  const areas = [TODAS, ...new Set(actividades.map((actividad) => actividad.areaActividad))]
  const filtradas = actividades.filter(
    (actividad) =>
      (area === TODAS || actividad.areaActividad === area) &&
      normalizar(actividad.descripcion).includes(normalizar(busqueda.trim())),
  )

  const idSeleccionada = useWatch({ control, name: 'idActividadEconomica' })
  const seleccionada = actividades.find((actividad) => String(actividad.idActividadEconomica) === idSeleccionada)
  const errorActividad = errors.idActividadEconomica?.message

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-10">
      <FormSection
        title="Actividad económica"
        description="Selecciona la actividad principal de la que el cliente obtiene sus ingresos."
      >
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Busca por descripción, p. ej. «comercio» o «cacao»"
              aria-label="Buscar actividad económica"
              className={cn(fieldClassName, 'pl-12')}
            />
          </div>

          <div role="group" aria-label="Filtrar por área" className="flex flex-wrap gap-2">
            {areas.map((nombre) => (
              <button
                key={nombre}
                type="button"
                aria-pressed={area === nombre}
                onClick={() => setArea(nombre)}
                className={cn(
                  'h-9 cursor-pointer rounded-full border px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  area === nombre
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-field text-muted-foreground hover:border-primary/50 hover:text-foreground',
                )}
              >
                {nombre}
              </button>
            ))}
          </div>
        </div>

        <EstadoCatalogo id="actividad-estado-catalogo" nombre="actividades económicas" consulta={consultaActividades} />

        <div
          role="radiogroup"
          aria-label="Actividad económica"
          aria-invalid={!!errorActividad}
          aria-describedby={errorActividad ? 'actividad-estado-catalogo idActividadEconomica-error' : 'actividad-estado-catalogo'}
          aria-busy={consultaActividades.isFetching && !actividades.length}
          className={cn(
            'flex max-h-90 flex-col gap-2 overflow-y-auto rounded-2xl border bg-field p-2',
            errorActividad ? 'border-destructive' : 'border-border',
          )}
        >
          {!consultaActividades.isFetching && !consultaActividades.isError && actividades.length > 0 && filtradas.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No hay actividades que coincidan con la búsqueda.
            </p>
          )}

          {filtradas.map((actividad) => (
            <label
              key={actividad.idActividadEconomica}
              className={cn(
                'flex cursor-pointer items-center gap-4 rounded-xl border border-transparent px-4 py-3 transition-colors',
                'hover:bg-muted has-checked:border-primary has-checked:bg-primary/8',
                'has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
              )}
            >
              <input
                type="radio"
                value={String(actividad.idActividadEconomica)}
                className="peer sr-only"
                {...register('idActividadEconomica')}
              />
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground peer-checked:bg-primary peer-checked:text-primary-foreground">
                <BriefcaseBusiness className="size-[18px]" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium text-heading">{actividad.descripcion}</span>
                <span className="text-sm text-muted-foreground">{actividad.areaActividad}</span>
              </span>
              <CircleCheck className="size-5 shrink-0 text-link opacity-0 transition-opacity peer-checked:opacity-100" />
            </label>
          ))}
        </div>

        {errorActividad ? (
          <p id="idActividadEconomica-error" className="-mt-2 text-sm text-destructive">
            {errorActividad}
          </p>
        ) : (
          seleccionada && (
            <p role="status" className="-mt-2 text-sm text-muted-foreground">
              Seleccionada: <span className="font-semibold text-heading">{seleccionada.descripcion}</span>
            </p>
          )
        )}
      </FormSection>

      <FormSection title="Consentimiento">
        <div className="flex flex-col gap-2.5">
          <Controller
            control={control}
            name="consentimientoDatos"
            render={({ field, fieldState }) => (
              <div
                className={cn(
                  'flex items-start gap-3 rounded-xl border bg-field p-4',
                  fieldState.error ? 'border-destructive' : 'border-border',
                )}
              >
                <Checkbox
                  id="consentimientoDatos"
                  ref={field.ref}
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                  onBlur={field.onBlur}
                  className="mt-0.5 size-5"
                  {...a11y('consentimientoDatos', fieldState.error?.message)}
                />
                <Label
                  htmlFor="consentimientoDatos"
                  className="block text-sm leading-relaxed font-normal text-muted-foreground"
                >
                  El cliente autoriza el tratamiento de sus datos personales conforme a la Ley Orgánica de Protección
                  de Datos Personales.
                </Label>
              </div>
            )}
          />
          {errors.consentimientoDatos && (
            <p id="consentimientoDatos-error" className="text-sm text-destructive">
              {errors.consentimientoDatos.message}
            </p>
          )}
        </div>
      </FormSection>

      <StepActions submitLabel="Registrar cliente" onBack={onBack} submitting={isSubmitting} />
    </form>
  )
}
