import type { ChangeEvent } from 'react'
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form'
import { Building2, UserRound } from 'lucide-react'

import { cn } from '@/shared/lib'
import { Input } from '@/shared/ui'
import { usePaises } from '@/features/catalogos'
import { CELULAR_PREFIJO, formatearCelular, normalizarCelular } from '@/features/clientes/lib/celular'
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
  ESTADOS_CIVILES,
  GENEROS,
  TIPOS_CLIENTE,
  type DatosClienteData,
  type DatosClienteInput,
} from '@/features/clientes/schemas/registro-cliente.schema'

const ICONO_TIPO = { NATURAL: UserRound, JURIDICO: Building2 } as const

const IDENTIFICACION_POR_TIPO = {
  NATURAL: { label: 'Cédula', maxLength: 10, placeholder: '10 dígitos' },
  JURIDICO: { label: 'RUC', maxLength: 13, placeholder: '13 dígitos' },
} as const

// Fecha local en formato YYYY-MM-DD (límite superior del selector de fecha)
const hoy = () => new Date().toLocaleDateString('en-CA')

const soloDigitos = (valor: string) => valor.replace(/\D/g, '')

interface DatosClienteStepProps {
  form: UseFormReturn<DatosClienteInput, unknown, DatosClienteData>
  onNext: () => void
}

export function DatosClienteStep({ form, onNext }: DatosClienteStepProps) {
  const {
    register,
    control,
    handleSubmit,
    clearErrors,
    setError,
    formState: { errors },
  } = form
  /** register para campos solo numéricos: descarta lo que no sea dígito antes de guardarlo */
  const registrarNumerico = (name: 'identificacion' | 'telefonoConvencional') => {
    const campo = register(name)
    return {
      ...campo,
      onChange: (event: ChangeEvent<HTMLInputElement>) => {
        event.target.value = soloDigitos(event.target.value)
        return campo.onChange(event)
      },
    }
  }
  const tipoCliente = useWatch({ control, name: 'tipoCliente' })
  const natural = tipoCliente === 'NATURAL'
  const identificacion = IDENTIFICACION_POR_TIPO[tipoCliente]
  const consultaPaises = usePaises()
  const { data: paises } = consultaPaises
  const opcionesPais = paises.map((pais) => ({ value: pais.codigoPais, label: pais.nombrePais }))

  const continuar = handleSubmit((datos) => {
    if (datos.tipoCliente === 'NATURAL' && !paises.some((pais) => pais.codigoPais === datos.codigoPaisNacionalidad)) {
      setError('codigoPaisNacionalidad', { type: 'validate', message: 'Selecciona una nacionalidad del catálogo disponible' })
      return
    }
    onNext()
  })

  return (
    <form onSubmit={continuar} noValidate className="flex flex-col gap-10">
      <FormSection title="Tipo de cliente" description="Define el documento con el que se identificará al cliente.">
        <div role="radiogroup" aria-label="Tipo de cliente" className="grid gap-3 sm:grid-cols-2">
          {TIPOS_CLIENTE.map(({ value, label, documento }) => {
            const Icono = ICONO_TIPO[value]
            return (
              <label
                key={value}
                className={cn(
                  'flex cursor-pointer items-center gap-4 rounded-2xl border border-border bg-field p-4 transition-colors',
                  'hover:border-primary/50 has-checked:border-primary has-checked:bg-primary/8',
                  'has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                )}
              >
                <input
                  type="radio"
                  value={value}
                  className="sr-only"
                  {...register('tipoCliente', { onChange: () => clearErrors() })}
                />
                <span
                  className={cn(
                    'flex size-11 shrink-0 items-center justify-center rounded-xl',
                    tipoCliente === value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}
                >
                  <Icono className="size-5" />
                </span>
                <span className="flex flex-col">
                  <span className="font-semibold text-heading">{label}</span>
                  <span className="text-sm text-muted-foreground">Se identifica con {documento}</span>
                </span>
              </label>
            )
          })}
        </div>
      </FormSection>

      <FormSection title={natural ? 'Datos personales' : 'Datos de la empresa'}>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field id="identificacion" label={identificacion.label} error={errors.identificacion?.message}>
            <Input
              id="identificacion"
              autoComplete="off"
              inputMode="numeric"
              maxLength={identificacion.maxLength}
              placeholder={identificacion.placeholder}
              className={fieldClassName}
              {...a11y('identificacion', errors.identificacion?.message)}
              {...registrarNumerico('identificacion')}
            />
          </Field>

          {natural ? (
            <>
              <Controller
                control={control}
                name="codigoPaisNacionalidad"
                render={({ field, fieldState }) => (
                  <Field id="codigoPaisNacionalidad" label="Nacionalidad" error={fieldState.error?.message}>
                    <SelectField
                      id="codigoPaisNacionalidad"
                      value={paises.some((pais) => pais.codigoPais === field.value) ? field.value : ''}
                      onChange={(valor) => {
                        field.onChange(valor)
                        clearErrors('codigoPaisNacionalidad')
                      }}
                      onBlur={field.onBlur}
                      options={opcionesPais}
                      placeholder={consultaPaises.isFetching && !paises.length ? 'Cargando países…' : 'Selecciona el país'}
                      disabled={!paises.length}
                      descriptionId="nacionalidad-estado-paises"
                      error={fieldState.error?.message}
                    />
                    <EstadoCatalogo id="nacionalidad-estado-paises" nombre="países" consulta={consultaPaises} />
                  </Field>
                )}
              />

              <Field id="nombres" label="Nombres" error={errors.nombres?.message}>
                <Input
                  id="nombres"
                  autoComplete="given-name"
                  placeholder="Ingresa los nombres"
                  className={fieldClassName}
                  {...a11y('nombres', errors.nombres?.message)}
                  {...register('nombres')}
                />
              </Field>

              <Field id="apellidos" label="Apellidos" error={errors.apellidos?.message}>
                <Input
                  id="apellidos"
                  autoComplete="family-name"
                  placeholder="Ingresa los apellidos"
                  className={fieldClassName}
                  {...a11y('apellidos', errors.apellidos?.message)}
                  {...register('apellidos')}
                />
              </Field>

              <Field id="fechaNacimiento" label="Fecha de nacimiento" error={errors.fechaNacimiento?.message}>
                <Input
                  id="fechaNacimiento"
                  type="date"
                  max={hoy()}
                  autoComplete="bday"
                  className={fieldClassName}
                  {...a11y('fechaNacimiento', errors.fechaNacimiento?.message)}
                  {...register('fechaNacimiento')}
                />
              </Field>

              <Controller
                control={control}
                name="genero"
                render={({ field, fieldState }) => (
                  <Field id="genero" label="Género" error={fieldState.error?.message}>
                    <SelectField
                      id="genero"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      options={GENEROS}
                      placeholder="Selecciona el género"
                      error={fieldState.error?.message}
                    />
                  </Field>
                )}
              />

              <Controller
                control={control}
                name="estadoCivil"
                render={({ field, fieldState }) => (
                  <Field id="estadoCivil" label="Estado civil" error={fieldState.error?.message}>
                    <SelectField
                      id="estadoCivil"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      options={ESTADOS_CIVILES}
                      placeholder="Selecciona el estado civil"
                      error={fieldState.error?.message}
                    />
                  </Field>
                )}
              />
            </>
          ) : (
            <>
              <Field id="razonSocial" label="Razón social" error={errors.razonSocial?.message}>
                <Input
                  id="razonSocial"
                  autoComplete="organization"
                  placeholder="Como consta en el RUC"
                  className={fieldClassName}
                  {...a11y('razonSocial', errors.razonSocial?.message)}
                  {...register('razonSocial')}
                />
              </Field>

              <Field
                id="nombreComercial"
                label="Nombre comercial"
                optional
                error={errors.nombreComercial?.message}
                className="sm:col-span-2"
              >
                <Input
                  id="nombreComercial"
                  placeholder="Nombre con el que opera el negocio"
                  className={fieldClassName}
                  {...a11y('nombreComercial', errors.nombreComercial?.message)}
                  {...register('nombreComercial')}
                />
              </Field>
            </>
          )}
        </div>
      </FormSection>

      <FormSection title="Contacto">
        <div className="grid gap-6 sm:grid-cols-2">
          <Controller
            control={control}
            name="telefonoCelular"
            render={({ field, fieldState }) => (
              <Field id="telefonoCelular" label="Teléfono celular (Ecuador)" error={fieldState.error?.message}>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center border-r border-border pr-3 pl-4 text-base font-medium text-muted-foreground">
                    {CELULAR_PREFIJO}
                  </span>
                  <Input
                    id="telefonoCelular"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="99 123 4567"
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={formatearCelular(field.value)}
                    onChange={(event) => field.onChange(normalizarCelular(event.target.value))}
                    className={cn(fieldClassName, 'pl-[88px]')}
                    {...a11y('telefonoCelular', fieldState.error?.message)}
                    aria-describedby={['telefonoCelular-ayuda', fieldState.error ? 'telefonoCelular-error' : undefined].filter(Boolean).join(' ')}
                  />
                </div>
                <p id="telefonoCelular-ayuda" className="text-sm text-muted-foreground">
                  Obligatorio. Usa un celular ecuatoriano, por ejemplo 099 123 4567. La nacionalidad no cambia el prefijo +593.
                </p>
              </Field>
            )}
          />

          <Field
            id="telefonoConvencional"
            label="Teléfono convencional"
            optional
            error={errors.telefonoConvencional?.message}
          >
            <Input
              id="telefonoConvencional"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={9}
              placeholder="022345678"
              className={fieldClassName}
              {...a11y('telefonoConvencional', errors.telefonoConvencional?.message)}
              {...registrarNumerico('telefonoConvencional')}
            />
          </Field>

          <Field id="email" label="Correo electrónico" error={errors.email?.message} className="sm:col-span-2">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="nombre@correo.com"
              className={fieldClassName}
              {...a11y('email', errors.email?.message)}
              {...register('email')}
            />
          </Field>
        </div>
      </FormSection>

      <StepActions submitLabel="Continuar" />
    </form>
  )
}
