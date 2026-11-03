import { useState, type ReactNode } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleCheck } from 'lucide-react'

import { cn } from '@/shared/lib'
import {
  Button,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui'
import { CELULAR_PREFIJO, formatearCelular, normalizarCelular } from '../lib/celular'
import {
  GENEROS,
  registroClienteSchema,
  TIPOS_DOCUMENTO,
  type RegistroClienteData,
  type RegistroClienteFormInput,
} from '../schemas/registro-cliente.schema'

const fieldClassName =
  'h-[52px] rounded-xl border-border bg-field px-4 text-base md:text-base placeholder:text-muted-foreground/80 dark:bg-field'
const selectClassName =
  'w-full rounded-xl border-border bg-field px-4 text-base data-[size=default]:h-[52px] dark:bg-field dark:hover:bg-field'

const DEFAULT_VALUES: Partial<RegistroClienteFormInput> = {
  identificacion: '',
  nombres: '',
  apellidos: '',
  fechaNacimiento: '',
  telefonoCelular: '',
  email: '',
  consentimientoDatos: false,
}

const IDENTIFICACION_POR_TIPO = {
  C: { maxLength: 10, inputMode: 'numeric', placeholder: '10 dígitos' },
  R: { maxLength: 13, inputMode: 'numeric', placeholder: '13 dígitos' },
  P: { maxLength: 20, inputMode: 'text', placeholder: 'Número de pasaporte' },
} as const

// Fecha local en formato YYYY-MM-DD (límite superior del selector de fecha)
const hoy = () => new Date().toLocaleDateString('en-CA')

interface FieldProps {
  id: keyof RegistroClienteFormInput
  label: string
  error?: string
  className?: string
  children: ReactNode
}

function Field({ id, label, error, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
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

export function RegistroClienteForm() {
  const [validatedData, setValidatedData] = useState<RegistroClienteData | null>(null)
  const {
    register,
    control,
    handleSubmit,
    reset,
    trigger,
    formState: { errors, isSubmitted, isSubmitting },
  } = useForm<RegistroClienteFormInput, unknown, RegistroClienteData>({
    resolver: zodResolver(registroClienteSchema),
    defaultValues: DEFAULT_VALUES,
  })
  const tipoDocumento = useWatch({ control, name: 'tipoDocumento' })
  const identificacionProps = IDENTIFICACION_POR_TIPO[tipoDocumento ?? 'C']

  const a11y = (name: keyof RegistroClienteFormInput) => ({
    'aria-invalid': !!errors[name],
    'aria-describedby': errors[name] ? `${name}-error` : undefined,
  })

  const onSubmit = (data: RegistroClienteData) => {
    // TODO: enviar `data` al endpoint de registro de clientes cuando exista su contrato API First
    setValidatedData(data)
  }

  const handleReset = () => {
    reset(DEFAULT_VALUES)
    setValidatedData(null)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="tipoDocumento" label="Tipo de documento" error={errors.tipoDocumento?.message}>
          <Controller
            control={control}
            name="tipoDocumento"
            render={({ field }) => (
              <Select
                value={field.value ?? ''}
                onValueChange={(value) => {
                  field.onChange(value)
                  if (isSubmitted) void trigger('identificacion')
                }}
              >
                <SelectTrigger
                  id="tipoDocumento"
                  ref={field.ref}
                  onBlur={field.onBlur}
                  className={selectClassName}
                  {...a11y('tipoDocumento')}
                >
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_DOCUMENTO.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field id="identificacion" label="Identificación" error={errors.identificacion?.message}>
          <Input
            id="identificacion"
            autoComplete="off"
            maxLength={identificacionProps.maxLength}
            inputMode={identificacionProps.inputMode}
            placeholder={identificacionProps.placeholder}
            className={fieldClassName}
            {...a11y('identificacion')}
            {...register('identificacion')}
          />
        </Field>

        <Field id="nombres" label="Nombres" error={errors.nombres?.message}>
          <Input
            id="nombres"
            autoComplete="given-name"
            placeholder="Ingresa los nombres"
            className={fieldClassName}
            {...a11y('nombres')}
            {...register('nombres')}
          />
        </Field>

        <Field id="apellidos" label="Apellidos" error={errors.apellidos?.message}>
          <Input
            id="apellidos"
            autoComplete="family-name"
            placeholder="Ingresa los apellidos"
            className={fieldClassName}
            {...a11y('apellidos')}
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
            {...a11y('fechaNacimiento')}
            {...register('fechaNacimiento')}
          />
        </Field>

        <Field id="genero" label="Género" error={errors.genero?.message}>
          <Controller
            control={control}
            name="genero"
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger
                  id="genero"
                  ref={field.ref}
                  onBlur={field.onBlur}
                  className={selectClassName}
                  {...a11y('genero')}
                >
                  <SelectValue placeholder="Selecciona el género" />
                </SelectTrigger>
                <SelectContent>
                  {GENEROS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field id="telefonoCelular" label="Teléfono celular" error={errors.telefonoCelular?.message}>
          <Controller
            control={control}
            name="telefonoCelular"
            render={({ field }) => (
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
                  value={formatearCelular(field.value ?? '')}
                  onChange={(event) => field.onChange(normalizarCelular(event.target.value))}
                  className={cn(fieldClassName, 'pl-[88px]')}
                  {...a11y('telefonoCelular')}
                />
              </div>
            )}
          />
        </Field>

        <Field id="email" label="Correo electrónico" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="nombre@correo.com"
            className={fieldClassName}
            {...a11y('email')}
            {...register('email')}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-2.5">
        <Controller
          control={control}
          name="consentimientoDatos"
          render={({ field }) => (
            <div className="flex items-start gap-3 rounded-xl border border-border bg-field p-4">
              <Checkbox
                id="consentimientoDatos"
                ref={field.ref}
                checked={field.value ?? false}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                onBlur={field.onBlur}
                className="mt-0.5 size-5"
                {...a11y('consentimientoDatos')}
              />
              <Label
                htmlFor="consentimientoDatos"
                className="block text-sm leading-relaxed font-normal text-muted-foreground"
              >
                El cliente autoriza el tratamiento de sus datos personales conforme a la Ley Orgánica de Protección de
                Datos Personales.
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

      {validatedData && (
        <p
          role="status"
          className="flex items-start gap-3 rounded-xl border border-info/40 bg-info/15 px-4 py-3 text-sm text-foreground"
        >
          <CircleCheck className="mt-0.5 size-[18px] shrink-0 text-link" />
          Datos validados correctamente. El registro se enviará cuando el servicio de registro de clientes esté
          disponible.
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={handleReset} className="h-[52px] rounded-xl px-6 text-base">
          Limpiar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-[52px] rounded-xl px-8 text-base font-semibold hover:bg-primary/90"
        >
          Registrar cliente
        </Button>
      </div>
    </form>
  )
}
