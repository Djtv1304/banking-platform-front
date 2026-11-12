import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useBeforeUnload, useBlocker } from 'react-router'
import { LoaderCircle, Save } from 'lucide-react'

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/shared/ui'
import type { Entidad, EntidadPatch } from '@/features/organizacion/api/entidad'
import { mensajeErrorEntidad } from '@/features/organizacion/api/entidad'
import {
  cambiosEntidad,
  entidadFormSchema,
  valoresEntidad,
  type EntidadForm as Valores,
} from '@/features/organizacion/lib/entidad-form'

const grupos: {
  titulo: string
  campos: {
    key: keyof Valores
    label: string
    max?: number
    type?: string
    opcional?: boolean
  }[]
}[] = [
  {
    titulo: 'Identificación institucional',
    campos: [
      { key: 'ruc', label: 'RUC', max: 13 },
      { key: 'razonSocial', label: 'Razón social', max: 250 },
      { key: 'nombreComercial', label: 'Nombre comercial', max: 150, opcional: true },
      { key: 'tipoOrganizacion', label: 'Tipo de organización', max: 60 },
    ],
  },
  {
    titulo: 'Información institucional',
    campos: [
      { key: 'segmento', label: 'Segmento', opcional: true },
      { key: 'numeroResolucionSeps', label: 'Número de resolución SEPS', max: 60, opcional: true },
      { key: 'fechaConstitucion', label: 'Fecha de constitución', type: 'date' },
    ],
  },
  {
    titulo: 'Representación legal',
    campos: [
      { key: 'representanteLegal', label: 'Representante legal', max: 250 },
      { key: 'identificacionRepresentante', label: 'Identificación del representante', max: 13 },
    ],
  },
  {
    titulo: 'Contacto',
    campos: [
      { key: 'telefono', label: 'Teléfono', type: 'tel', max: 15, opcional: true },
      { key: 'email', label: 'Correo electrónico', type: 'email', max: 150, opcional: true },
      { key: 'sitioWeb', label: 'Sitio web', type: 'url', max: 150, opcional: true },
    ],
  },
]

interface Props {
  entidad: Entidad
  pendiente: boolean
  error: Error | null
  guardar: (patch: EntidadPatch) => Promise<void>
  cancelar: () => void
}

export function EntidadForm({ entidad, pendiente, error, guardar, cancelar }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<Valores>({
    resolver: zodResolver(entidadFormSchema),
    defaultValues: valoresEntidad(entidad),
    shouldFocusError: true,
  })
  const [descartar, setDescartar] = useState(false)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      (isDirty || pendiente) && currentLocation.pathname !== nextLocation.pathname,
  )

  useBeforeUnload((event) => {
    if (isDirty || pendiente) {
      event.preventDefault()
      event.returnValue = ''
    }
  })

  const enviar = handleSubmit(async (datos) => {
    try {
      await guardar(cambiosEntidad(entidad, datos))
    } catch {
      /* La mutación muestra el error sin borrar el borrador. */
    }
  })
  const clase = 'h-[52px] w-full rounded-xl border border-border bg-field px-4 text-base text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:scheme-dark'

  return (
    <>
      <form
        onSubmit={enviar}
        noValidate
        className="flex flex-col gap-8"
        aria-label="Editar datos de la cooperativa"
        aria-busy={pendiente}
      >
        <p className="text-sm text-muted-foreground">
          Los campos sin la indicación «opcional» son obligatorios. El estado y los datos del registro se conservan.
        </p>
        <fieldset disabled={pendiente} className="flex min-w-0 flex-col gap-8">
          {grupos.map((grupo) => (
            <section
              key={grupo.titulo}
              aria-label={grupo.titulo}
              className="flex flex-col gap-5"
            >
              <h3 className="border-b border-border pb-3 text-lg font-semibold text-heading">
                {grupo.titulo}
              </h3>
              <div className="grid gap-5 sm:grid-cols-2">
                {grupo.campos.map(({ key, label, max, type, opcional }) => {
                  const id = `entidad-${key}`
                  const campo = register(key)

                  return (
                    <div key={key} className="flex flex-col gap-2.5">
                      <Label htmlFor={id} className="text-[15px] font-semibold text-heading">
                        {label}
                        {opcional && <span className="font-normal text-muted-foreground"> (opcional)</span>}
                      </Label>
                      {key === 'segmento' ? (
                        <select
                          id={id}
                          className={clase}
                          {...campo}
                          aria-invalid={!!errors[key]}
                          aria-describedby={errors[key] ? `${id}-error` : undefined}
                        >
                          <option value="">Sin especificar</option>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={String(n)}>Segmento {n}</option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          id={id}
                          type={type ?? 'text'}
                          maxLength={max}
                          className={clase}
                          {...campo}
                          onChange={(event) => {
                            if (key === 'identificacionRepresentante')
                              event.target.value = event.target.value.toUpperCase()
                            void campo.onChange(event)
                          }}
                          aria-required={!opcional}
                          aria-invalid={!!errors[key]}
                          aria-describedby={errors[key] ? `${id}-error` : undefined}
                        />
                      )}
                      {errors[key] && (
                        <p id={`${id}-error`} className="text-sm text-destructive">
                          {errors[key]?.message}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </fieldset>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
          >
            {mensajeErrorEntidad(error, true)}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={pendiente}
            onClick={() => isDirty ? setDescartar(true) : cancelar()}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={pendiente || !isDirty}
            className="min-h-11 rounded-xl px-6"
          >
            {pendiente ? <LoaderCircle className="animate-spin" /> : <Save />}
            {pendiente ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </form>

      <Dialog
        open={descartar || blocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open) {
            setDescartar(false)
            if (blocker.state === 'blocked') blocker.reset()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Descartar los cambios?</DialogTitle>
            <DialogDescription>
              {pendiente
                ? 'El guardado está en curso. Espera a que termine antes de salir.'
                : 'Tienes cambios sin guardar. Si sales, perderás este borrador.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setDescartar(false)
                if (blocker.state === 'blocked') blocker.reset()
              }}
            >
              Seguir editando
            </Button>
            <Button
              disabled={pendiente}
              onClick={() => {
                reset(valoresEntidad(entidad))
                setDescartar(false)
                if (blocker.state === 'blocked') blocker.proceed()
                else cancelar()
              }}
            >
              Descartar cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
