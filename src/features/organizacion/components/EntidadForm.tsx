import { useState, type ComponentProps } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, Save } from 'lucide-react'

import { toApiError } from '@/shared/api'
import {
  Aviso,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui'
import type { Entidad } from '@/features/organizacion/api/entidad.contract'
import { useActualizarEntidad } from '@/features/organizacion/hooks/useEntidad'
import {
  cambiosEntidad,
  entidadFormSchema,
  hayCambios,
  valoresEntidad,
  type EntidadFormData,
  type EntidadFormInput,
} from '@/features/organizacion/lib/entidad'
import { mensajeErrorEntidad, OPCIONES_ESTADO_ENTIDAD, SEGMENTOS } from '@/features/organizacion/lib/entidad-texto'

const campoClassName = 'h-11 rounded-xl border-border bg-field px-3 text-base md:text-base dark:bg-field dark:scheme-dark'
const selectClassName =
  'w-full rounded-xl border-border bg-field px-3 text-base data-[size=default]:h-11 dark:bg-field dark:hover:bg-field'

/** Radix no admite un ítem con valor vacío: este representa «sin segmento» (null) */
const SIN_SEGMENTO = 'sin-segmento'

interface EntidadFormProps {
  entidad: Entidad
  onCancelar: () => void
  onGuardado: () => void
}

/** Edición parcial de la entidad (solo ADMIN): solo viaja lo que cambió */
export function EntidadForm({ entidad, onCancelar, onGuardado }: EntidadFormProps) {
  const actualizar = useActualizarEntidad()
  const [sinCambios, setSinCambios] = useState(false)
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EntidadFormInput, unknown, EntidadFormData>({
    resolver: zodResolver(entidadFormSchema),
    defaultValues: valoresEntidad(entidad),
  })

  const guardar = (datos: EntidadFormData) => {
    const body = cambiosEntidad(entidad, datos)
    // Nada cambió: no se llama al backend (un PATCH vacío daría 400)
    if (!hayCambios(body)) {
      setSinCambios(true)
      return
    }
    setSinCambios(false)
    actualizar.mutate(body, { onSuccess: onGuardado })
  }

  const campo = (nombre: keyof EntidadFormInput, label: string, props: ComponentProps<'input'> = {}, opcional = false) => {
    const id = `entidad-${nombre}`
    const error = errors[nombre]?.message
    return (
      <div className="flex flex-col gap-2">
        <Label htmlFor={id} className="text-sm font-semibold text-heading">
          {label}
          {opcional && <span className="font-normal text-muted-foreground"> (opcional)</span>}
        </Label>
        <Input
          id={id}
          autoComplete="off"
          className={campoClassName}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
          {...register(nombre)}
        />
        {error && (
          <p id={`${id}-error`} className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    )
  }

  const errorSegmento = errors.segmento?.message
  const errorEstado = errors.estado?.message

  return (
    <form
      onSubmit={handleSubmit(guardar)}
      onChange={() => setSinCambios(false)}
      noValidate
      aria-label="Editar los datos de la entidad"
      className="flex flex-col gap-6 rounded-3xl border border-border bg-card p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {campo('ruc', 'RUC', { inputMode: 'numeric', maxLength: 13 })}
        {campo('razonSocial', 'Razón social', { maxLength: 250 })}
        {campo('nombreComercial', 'Nombre comercial', { maxLength: 150 }, true)}
        {campo('tipoOrganizacion', 'Tipo de organización', { maxLength: 60 })}

        <div className="flex flex-col gap-2">
          <Label htmlFor="entidad-segmento" className="text-sm font-semibold text-heading">
            Segmento<span className="font-normal text-muted-foreground"> (opcional)</span>
          </Label>
          <Controller
            control={control}
            name="segmento"
            render={({ field }) => (
              <Select
                value={field.value === '' ? SIN_SEGMENTO : field.value}
                onValueChange={(valor) => field.onChange(valor === SIN_SEGMENTO ? '' : valor)}
              >
                <SelectTrigger
                  id="entidad-segmento"
                  onBlur={field.onBlur}
                  className={selectClassName}
                  aria-invalid={!!errorSegmento}
                  aria-describedby={errorSegmento ? 'entidad-segmento-error' : undefined}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_SEGMENTO}>Sin segmento</SelectItem>
                  {SEGMENTOS.map((segmento) => (
                    <SelectItem key={segmento} value={String(segmento)}>
                      Segmento {segmento}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errorSegmento && (
            <p id="entidad-segmento-error" className="text-sm text-destructive">
              {errorSegmento}
            </p>
          )}
        </div>

        {campo('numeroResolucionSeps', 'Resolución SEPS', { maxLength: 60 }, true)}
        {campo('fechaConstitucion', 'Fecha de constitución', { type: 'date' })}

        <div className="flex flex-col gap-2">
          <Label htmlFor="entidad-estado" className="text-sm font-semibold text-heading">
            Estado
          </Label>
          <Controller
            control={control}
            name="estado"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="entidad-estado"
                  onBlur={field.onBlur}
                  className={selectClassName}
                  aria-invalid={!!errorEstado}
                  aria-describedby={errorEstado ? 'entidad-estado-error' : undefined}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPCIONES_ESTADO_ENTIDAD.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errorEstado && (
            <p id="entidad-estado-error" className="text-sm text-destructive">
              {errorEstado}
            </p>
          )}
        </div>

        {campo('representanteLegal', 'Representante legal', { maxLength: 250 })}
        {campo('identificacionRepresentante', 'Identificación del representante', { maxLength: 13 })}
        {campo('telefono', 'Teléfono', { type: 'tel', maxLength: 15 }, true)}
        {campo('email', 'Correo electrónico', { type: 'email', maxLength: 150 }, true)}
        {campo('sitioWeb', 'Sitio web', { maxLength: 150 }, true)}
      </div>

      {sinCambios && <Aviso>No hay cambios por guardar: los datos son los mismos que ya están registrados.</Aviso>}
      {actualizar.isError && <Aviso tono="error">{mensajeErrorEntidad(toApiError(actualizar.error), 'editar')}</Aviso>}

      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" size="lg" onClick={onCancelar} className="rounded-lg px-4">
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={actualizar.isPending} className="rounded-lg px-4 font-semibold">
          {actualizar.isPending ? <LoaderCircle className="animate-spin" /> : <Save />}
          Guardar cambios
        </Button>
      </div>
    </form>
  )
}
