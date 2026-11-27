import type { ChangeEvent, FormEvent } from 'react'
import { codigoCatalogo, useTiposIdentidad } from '@/features/clientes/api/documentos-identidad'
import { usePaises } from '@/features/catalogos/hooks/useCatalogos'
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form'
import { Building2, UserRound } from 'lucide-react'

import { cn } from '@/shared/lib'
import { FechaInput, Input } from '@/shared/ui'
import { CELULAR_PREFIJO, formatearCelular, normalizarCelular } from '@/features/clientes/lib/celular'
import { a11y } from '@/features/clientes/lib/a11y'
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

const soloDigitos = (valor: string) => valor.replace(/\D/g, '')

interface DatosClienteStepProps {
  form: UseFormReturn<DatosClienteInput, unknown, DatosClienteData>
  onNext: () => void
  soloDocumento?: boolean
  verificar?: (documento: { tipoDocumento: string; numero: string; codigoPaisEmision?: string }) => Promise<void>
}

export function DatosClienteStep({ form, onNext, soloDocumento = false, verificar }: DatosClienteStepProps) {
  const {
    register,
    control,
    handleSubmit,
    clearErrors,
    setValue,
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
  const tipoDocumento = useWatch({ control, name: 'tipoDocumento' })
  const natural = tipoCliente === 'NATURAL'
  const tipos = useTiposIdentidad()
  const paises = usePaises()
  const opciones = (tipos.data ?? []).filter((tipo) => tipo.activo && tipo.permitePrincipal && tipo.aplicaNatural)
  const regla = opciones.find((tipo) => tipo.codigo === codigoCatalogo(tipoDocumento))
  const continuar = handleSubmit(onNext)
  const comprobar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const datos = form.getValues()
    if (!regla) {
      form.setError('tipoDocumento', { message: 'Selecciona un tipo activo del catálogo.' })
      return
    }
    const numero = datos.identificacion.trim()
    if (!numero) {
      form.setError('identificacion', { message: 'Ingresa el número de documento.' })
      return
    }
    if (regla.requierePais && !datos.codigoPaisEmision) {
      form.setError('codigoPaisEmision', { message: 'Selecciona el país emisor.' })
      return
    }
    if (regla.requiereVencimiento && !/^\d{4}-\d{2}-\d{2}$/.test(datos.fechaVencimiento ?? '')) {
      form.setError('fechaVencimiento', { message: 'Ingresa el vencimiento.' })
      return
    }
    await verificar?.({
      tipoDocumento: codigoCatalogo(datos.tipoDocumento), numero,
      codigoPaisEmision: datos.codigoPaisEmision || undefined,
    })
  }

  if (soloDocumento) return (
    <form onSubmit={(evento) => void comprobar(evento)} noValidate className="flex flex-col gap-6">
      <FormSection title="Documento de identidad">
        <div className="grid gap-6 sm:grid-cols-2">
          {natural && <Controller control={control} name="tipoDocumento" render={({ field, fieldState }) => (
            <Field id="tipoDocumento" label="Tipo de documento" error={fieldState.error?.message}>
              <SelectField id="tipoDocumento" value={codigoCatalogo(field.value)} onBlur={field.onBlur}
                onChange={(valor) => {
                  field.onChange(valor)
                  setValue('identificacion', '', { shouldDirty: true })
                  setValue('codigoPaisEmision', '')
                  setValue('fechaVencimiento', '')
                  clearErrors(['identificacion', 'codigoPaisEmision', 'fechaVencimiento'])
                }}
                options={opciones.map((tipo) => ({ value: tipo.codigo, label: tipo.nombre }))} placeholder="Selecciona el documento" error={fieldState.error?.message} />
            </Field>
          )} />}
          <Field id="identificacion" label="Número de documento" error={errors.identificacion?.message}>
            <Input
              id="identificacion"
              autoComplete="off"
              inputMode={regla?.patronCaracteres === 'DIGITOS' ? 'numeric' : 'text'}
              maxLength={regla?.longitudMaxima ?? 20}
              className={fieldClassName}
              {...a11y('identificacion', errors.identificacion?.message)}
              {...register('identificacion')}
            />
          </Field>
          {tipos.isError && (
            <button type="button" className="text-link underline" onClick={() => void tipos.refetch()}>
              Reintentar carga de tipos de documento
            </button>
          )}
          {regla?.requierePais && (
            <Controller control={control} name="codigoPaisEmision" render={({ field, fieldState }) => (
              <Field id="codigoPaisEmision" label="País emisor" error={fieldState.error?.message}>
                <SelectField id="codigoPaisEmision" value={field.value ?? ''} onChange={field.onChange}
                  options={paises.data.map((pais) => ({ value: pais.codigoPais, label: pais.nombrePais }))}
                  placeholder="Selecciona el país emisor" error={fieldState.error?.message} />
              </Field>
            )} />
          )}
          {regla?.requiereVencimiento && (
            <Controller control={control} name="fechaVencimiento" render={({ field, fieldState }) => (
              <div><FechaInput id="fechaVencimiento" label="Fecha de vencimiento" value={field.value ?? ''}
                onChange={field.onChange} onBlur={field.onBlur} invalid={!!fieldState.error}
                errorId={fieldState.error ? 'fecha-vencimiento-error' : undefined} />
                {fieldState.error && <p role="alert" id="fecha-vencimiento-error">{fieldState.error.message}</p>}</div>
            )} />
          )}

        </div>
      </FormSection>
      <StepActions submitLabel="Continuar" />
    </form>
  )


  return (
    <form onSubmit={continuar} noValidate className="flex flex-col gap-10">
      <FormSection title="Tipo de cliente" description="Define el documento con el que se identificará al cliente.">
        <p id="juridico-pendiente" className="text-sm text-muted-foreground">Persona jurídica: registro pendiente de acordar con backend los datos obligatorios de la empresa.</p>
        <div role="radiogroup" aria-label="Tipo de cliente" className="grid gap-3 sm:grid-cols-2">
          {TIPOS_CLIENTE.map(({ value, label, documento }) => {
            const Icono = ICONO_TIPO[value]
            return (
              <label
                key={value}
                className={cn(
                  'relative flex cursor-pointer items-center gap-4 rounded-2xl border border-border bg-field p-4 transition-colors',
                  'hover:border-primary/50 has-checked:border-primary has-checked:bg-primary/8',
                  'has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                  value === 'JURIDICO' && 'cursor-not-allowed opacity-50',
                )}
              >
                <input
                  type="radio"
                  value={value}
                  disabled={value === 'JURIDICO'}
                  aria-describedby={value === 'JURIDICO' ? 'juridico-pendiente' : undefined}
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
          {natural ? (
            <>
              <div className="flex flex-col gap-2.5">
                <dl className="flex flex-col gap-2.5">
                  <dt className="text-[15px] font-semibold text-heading">Nacionalidad</dt>
                  <dd>Ecuador</dd>
                </dl>
                <input type="hidden" {...register('codigoPaisNacionalidad')} />
                {errors.codigoPaisNacionalidad?.message && (
                  <p role="alert" className="text-sm text-destructive">{errors.codigoPaisNacionalidad.message}</p>
                )}
              </div>

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

              <div className="flex min-w-0 flex-col gap-2.5 sm:col-span-2">
                <Controller
                  name="fechaNacimiento"
                  control={control}
                  render={({ field }) => (
                    <FechaInput
                      id="fechaNacimiento"
                      label="Fecha de nacimiento"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      inputRef={field.ref}
                      inputClassName={fieldClassName}
                      autoComplete="bday"
                      required
                      invalid={!!errors.fechaNacimiento}
                      errorId={errors.fechaNacimiento ? 'fechaNacimiento-error' : undefined}
                    />
                  )}
                />
                {errors.fechaNacimiento && (
                  <p id="fechaNacimiento-error" className="text-sm text-destructive">
                    {errors.fechaNacimiento.message}
                  </p>
                )}
              </div>

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
