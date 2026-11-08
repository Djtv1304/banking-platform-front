import { Controller, useFieldArray, useWatch, type UseFormReturn } from 'react-hook-form'
import { MapPin, Plus, Star, Trash2 } from 'lucide-react'

import { cn } from '@/shared/lib'
import { Badge, Button, Input } from '@/shared/ui'
import { useCiudades, usePaises } from '@/features/catalogos'
import { a11y } from '@/features/clientes/lib/a11y'
import { EstadoCatalogo } from '@/features/clientes/components/EstadoCatalogo'
import {
  Field,
  fieldClassName,
  FormSection,
  SelectField,
  StepActions,
} from '@/features/clientes/components/form-fields'
import {
  nuevaDireccion,
  TIPOS_DIRECCION,
  type DireccionesData,
  type DireccionesInput,
} from '@/features/clientes/schemas/registro-cliente.schema'

const MAX_DIRECCIONES = 4

type DireccionesForm = UseFormReturn<DireccionesInput, unknown, DireccionesData>

interface DireccionesStepProps {
  form: DireccionesForm
  onBack: () => void
  onNext: () => void
}

export function DireccionesStep({ form, onBack, onNext }: DireccionesStepProps) {
  const {
    control,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'direcciones' })
  const errorLista = errors.direcciones?.message ?? errors.direcciones?.root?.message

  const marcarPrincipal = (indice: number) => {
    getValues('direcciones').forEach((_, i) => setValue(`direcciones.${i}.esPrincipal`, i === indice))
  }

  const quitar = (indice: number) => {
    const eraPrincipal = getValues(`direcciones.${indice}.esPrincipal`)
    remove(indice)
    if (eraPrincipal) setValue('direcciones.0.esPrincipal', true)
  }

  return (
    <form onSubmit={handleSubmit(onNext)} noValidate className="flex flex-col gap-10">
      <FormSection
        title="Direcciones del cliente"
        description="Registra al menos la dirección principal. Puedes agregar otras, como la del trabajo o el negocio."
      >
        <ul className="flex flex-col gap-5">
          {fields.map((field, indice) => (
            <li key={field.id}>
              <DireccionCard
                form={form}
                indice={indice}
                puedeQuitar={fields.length > 1}
                onQuitar={() => quitar(indice)}
                onMarcarPrincipal={() => marcarPrincipal(indice)}
              />
            </li>
          ))}
        </ul>

        {errorLista && (
          <p role="alert" className="text-sm text-destructive">
            {errorLista}
          </p>
        )}

        {fields.length < MAX_DIRECCIONES && (
          <button
            type="button"
            onClick={() => append(nuevaDireccion(false))}
            className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-sm font-semibold text-link transition-colors outline-none hover:border-primary/60 hover:bg-primary/5 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Plus className="size-4" />
            Agregar otra dirección
          </button>
        )}
      </FormSection>

      <StepActions submitLabel="Continuar" onBack={onBack} />
    </form>
  )
}

interface DireccionCardProps {
  form: DireccionesForm
  indice: number
  puedeQuitar: boolean
  onQuitar: () => void
  onMarcarPrincipal: () => void
}

function DireccionCard({ form, indice, puedeQuitar, onQuitar, onMarcarPrincipal }: DireccionCardProps) {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = form
  const ruta = `direcciones.${indice}` as const
  const error = errors.direcciones?.[indice]
  const id = (campo: string) => `direccion-${indice}-${campo}`

  const [esPrincipal, codigoPais, provincia] = useWatch({
    control,
    name: [`${ruta}.esPrincipal`, `${ruta}.codigoPais`, `${ruta}.provincia`],
  })

  const consultaPaises = usePaises()
  const { data: paises } = consultaPaises
  const paisDisponible = paises.some((pais) => pais.codigoPais === codigoPais)
  const consultaCiudades = useCiudades(paisDisponible ? codigoPais : undefined)
  const { data: ciudades } = consultaCiudades
  const provincias = [...new Set(ciudades.map((ciudad) => ciudad.provincia))].sort((a, b) => a.localeCompare(b, 'es'))
  const ciudadesDeProvincia = ciudades.filter((ciudad) => ciudad.provincia === provincia)

  return (
    <article
      className={cn(
        'flex flex-col gap-6 rounded-2xl border bg-card p-5 sm:p-6',
        esPrincipal ? 'border-primary/60 ring-4 ring-primary/8' : 'border-border',
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <MapPin className="size-5" />
          </span>
          <h3 className="font-semibold text-heading">Dirección {indice + 1}</h3>
          {esPrincipal && (
            <Badge className="h-6 gap-1 px-2.5">
              <Star className="fill-current" />
              Principal
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1">
          {!esPrincipal && (
            <Button type="button" variant="ghost" size="sm" onClick={onMarcarPrincipal} className="text-link">
              <Star />
              Marcar como principal
            </Button>
          )}
          {puedeQuitar && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onQuitar}
              aria-label={`Quitar dirección ${indice + 1}`}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 />
            </Button>
          )}
        </div>
      </header>

      <div className="grid gap-6 sm:grid-cols-2">
        <Controller
          control={control}
          name={`${ruta}.tipoDireccion`}
          render={({ field, fieldState }) => (
            <Field id={id('tipo')} label="Tipo de dirección" error={fieldState.error?.message}>
              <SelectField
                id={id('tipo')}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                options={TIPOS_DIRECCION}
                placeholder="Selecciona el tipo"
                error={fieldState.error?.message}
              />
            </Field>
          )}
        />

        <Controller
          control={control}
          name={`${ruta}.codigoPais`}
          render={({ field, fieldState }) => (
            <Field id={id('pais')} label="País" error={fieldState.error?.message}>
              <SelectField
                id={id('pais')}
                value={paisDisponible ? field.value : ''}
                onChange={(valor) => {
                  field.onChange(valor)
                  setValue(`${ruta}.provincia`, '')
                  setValue(`${ruta}.idCiudad`, '')
                }}
                onBlur={field.onBlur}
                options={paises.map((pais) => ({ value: pais.codigoPais, label: pais.nombrePais }))}
                placeholder={consultaPaises.isPending ? 'Cargando países…' : 'Selecciona el país'}
                disabled={!paises.length}
                descriptionId={id('estado-paises')}
                error={fieldState.error?.message}
              />
              <EstadoCatalogo id={id('estado-paises')} nombre="países" consulta={consultaPaises} />
            </Field>
          )}
        />

        <Controller
          control={control}
          name={`${ruta}.provincia`}
          render={({ field, fieldState }) => (
            <Field id={id('provincia')} label="Provincia" error={fieldState.error?.message}>
              <SelectField
                id={id('provincia')}
                value={field.value}
                onChange={(valor) => {
                  field.onChange(valor)
                  setValue(`${ruta}.idCiudad`, '')
                }}
                onBlur={field.onBlur}
                options={provincias.map((nombre) => ({ value: nombre, label: nombre }))}
                placeholder={paisDisponible ? 'Selecciona la provincia' : 'Primero elige el país'}
                disabled={!provincias.length}
                descriptionId={paisDisponible ? id('estado-ciudades') : undefined}
                error={fieldState.error?.message}
              />
              {paisDisponible && (
                <EstadoCatalogo id={id('estado-ciudades')} nombre="ciudades" consulta={consultaCiudades} />
              )}
            </Field>
          )}
        />

        <Controller
          control={control}
          name={`${ruta}.idCiudad`}
          render={({ field, fieldState }) => (
            <Field id={id('ciudad')} label="Ciudad" error={fieldState.error?.message}>
              <SelectField
                id={id('ciudad')}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                options={ciudadesDeProvincia.map((ciudad) => ({ value: String(ciudad.idCiudad), label: ciudad.nombre }))}
                placeholder={provincia ? 'Selecciona la ciudad' : 'Primero elige la provincia'}
                disabled={!ciudadesDeProvincia.length}
                descriptionId={paisDisponible ? id('estado-ciudades') : undefined}
                error={fieldState.error?.message}
              />
            </Field>
          )}
        />

        <Field
          id={id('calle')}
          label="Calle principal, número y secundaria"
          error={error?.calleDireccion?.message}
          className="sm:col-span-2"
        >
          <Input
            id={id('calle')}
            autoComplete="street-address"
            placeholder="Av. Amazonas N34-120 y Av. Colón"
            className={fieldClassName}
            {...a11y(id('calle'), error?.calleDireccion?.message)}
            {...register(`${ruta}.calleDireccion`)}
          />
        </Field>

        <Field
          id={id('referencia')}
          label="Referencia de ubicación"
          error={error?.referenciaUbicacion?.message}
          className="sm:col-span-2"
        >
          <Input
            id={id('referencia')}
            placeholder="Frente al parque, edificio blanco de 3 pisos"
            className={fieldClassName}
            {...a11y(id('referencia'), error?.referenciaUbicacion?.message)}
            {...register(`${ruta}.referenciaUbicacion`)}
          />
        </Field>

        <Field id={id('sector')} label="Sector o barrio" optional error={error?.sector?.message}>
          <Input
            id={id('sector')}
            placeholder="La Mariscal"
            className={fieldClassName}
            {...a11y(id('sector'), error?.sector?.message)}
            {...register(`${ruta}.sector`)}
          />
        </Field>

        <Field id={id('postal')} label="Código postal" optional error={error?.codigoPostal?.message}>
          <Input
            id={id('postal')}
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={6}
            placeholder="170143"
            className={fieldClassName}
            {...a11y(id('postal'), error?.codigoPostal?.message)}
            {...register(`${ruta}.codigoPostal`)}
          />
        </Field>
      </div>
    </article>
  )
}
