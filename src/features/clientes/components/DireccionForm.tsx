import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import { useCiudades, usePaises, useTiposDireccion } from '@/features/catalogos'
import { Button, Checkbox, Input, Label } from '@/shared/ui'
import { EstadoCatalogo } from '@/features/clientes/components/EstadoCatalogo'
import { Field, fieldClassName, SelectField } from '@/features/clientes/components/form-fields'
import { a11y } from '@/features/clientes/lib/a11y'
import { direccionFormSchema, payloadDireccion, valoresDireccion, type DireccionForm as Valores } from '@/features/clientes/lib/direcciones'
import type { DireccionGestion, DireccionNueva } from '@/features/clientes/api/direcciones.contract'

interface Props {
  direccion?: DireccionGestion
  pendiente: boolean
  error: string | null
  onGuardar: (body: DireccionNueva) => Promise<void>
  onCancelar: () => void
}

export function DireccionForm({ direccion, pendiente, error, onGuardar, onCancelar }: Props) {
  const form = useForm<Valores>({ resolver: zodResolver(direccionFormSchema), defaultValues: valoresDireccion(direccion) })
  const { register, control, setValue, setError, clearErrors, handleSubmit, formState: { errors } } = form
  const [codigoPais, idCiudad] = useWatch({ control, name: ['codigoPais', 'idCiudad'] })
  const paises = usePaises()
  const tipos = useTiposDireccion()
  const tiposActivos = tipos.data.filter((tipo) => tipo.estado === 'A')
  const tipoGuardado = direccion
    ? tipos.data.find((tipo) => tipo.codigo === direccion.tipoDireccion)
    : undefined
  const opcionesTipo = tiposActivos.map((tipo) => ({ value: tipo.codigo, label: tipo.nombre }))
  if (direccion && !tiposActivos.some((tipo) => tipo.codigo === direccion.tipoDireccion)) {
    opcionesTipo.push({
      value: direccion.tipoDireccion,
      label: `${tipoGuardado?.nombre ?? direccion.tipoDireccion} (${tipoGuardado?.estado === 'I' ? 'tipo retirado' : 'tipo guardado'})`,
    })
  }
  const paisValido = paises.data.some((p) => p.codigoPais === codigoPais)
  const ciudades = useCiudades(paisValido ? codigoPais : undefined)
  const ciudad = ciudades.data.find((c) => String(c.idCiudad) === idCiudad)
  const [provinciaElegida, setProvincia] = useState<string | undefined>()
  const provincia = provinciaElegida ?? ciudad?.provincia ?? ''
  const provincias = [...new Set(ciudades.data.map((c) => c.provincia))].sort((a, b) => a.localeCompare(b, 'es'))
  const catalogosDisponibles = paisValido && !paises.isError && !ciudades.isError && !ciudades.isFetching && !!ciudad
    && !tipos.isPending && !tipos.isError && opcionesTipo.length > 0
  const id = (campo: string) => `gestion-direccion-${campo}`

  const guardar = handleSubmit(async (valores) => {
    const conservaTipo = direccion?.tipoDireccion === valores.tipoDireccion
    if (tipos.isError || (!conservaTipo && !tiposActivos.some((tipo) => tipo.codigo === valores.tipoDireccion))) {
      setError('tipoDireccion', { message: 'Selecciona un tipo activo del catálogo' })
      return
    }
    if (!paisValido || paises.isError) { setError('codigoPais', { message: 'Recupera el catálogo y selecciona un país válido' }); return }
    if (!ciudad || ciudad.codigoPais !== valores.codigoPais || ciudad.provincia !== provincia || ciudades.isError) {
      setError('idCiudad', { message: 'Selecciona una ciudad válida para el país y provincia' }); return
    }
    await onGuardar(payloadDireccion(valores))
  })

  return (
    <form onSubmit={guardar} noValidate className="flex flex-col gap-5">
      <fieldset disabled={pendiente} className="grid min-w-0 gap-5 sm:grid-cols-2">
        <Controller control={control} name="tipoDireccion" render={({ field, fieldState }) => (
          <Field id={id('tipo')} label="Tipo de dirección" error={fieldState.error?.message}>
            <SelectField id={id('tipo')} value={field.value} onChange={field.onChange} onBlur={field.onBlur}
              options={opcionesTipo} placeholder="Selecciona el tipo" error={fieldState.error?.message}
              disabled={tipos.isPending || tipos.isError || !opcionesTipo.length} descriptionId={id('estado-tipos')} />
            <EstadoCatalogo id={id('estado-tipos')} nombre="tipos de dirección" consulta={{ ...tipos, data: opcionesTipo }} />
          </Field>
        )} />
        <Controller control={control} name="codigoPais" render={({ field, fieldState }) => (
          <Field id={id('pais')} label="País" error={fieldState.error?.message}>
            <SelectField id={id('pais')} value={paisValido ? field.value : ''} onBlur={field.onBlur}
              onChange={(valor) => { field.onChange(valor); setProvincia(''); setValue('idCiudad', '', { shouldDirty: true }); clearErrors('idCiudad') }}
              options={paises.data.map((p) => ({ value: p.codigoPais, label: p.nombrePais }))} placeholder="Selecciona el país"
              disabled={paises.isError || !paises.data.length} error={fieldState.error?.message} descriptionId={id('estado-paises')} />
            <EstadoCatalogo id={id('estado-paises')} nombre="países" consulta={paises} />
          </Field>
        )} />
        <Field id={id('provincia')} label="Provincia / departamento">
          <SelectField id={id('provincia')} value={provincia} onChange={(valor) => { setProvincia(valor); setValue('idCiudad', '', { shouldDirty: true }); clearErrors('idCiudad') }}
            options={provincias.map((value) => ({ value, label: value }))} placeholder="Selecciona la provincia"
            disabled={!paisValido || ciudades.isError || !provincias.length} descriptionId={id('estado-ciudades')} />
          {paisValido ? <EstadoCatalogo id={id('estado-ciudades')} nombre="ciudades" consulta={ciudades} />
            : <p id={id('estado-ciudades')} className="text-sm text-muted-foreground">Selecciona primero un país disponible.</p>}
        </Field>
        <Controller control={control} name="idCiudad" render={({ field, fieldState }) => (
          <Field id={id('ciudad')} label="Ciudad" error={fieldState.error?.message}>
            <SelectField id={id('ciudad')} value={ciudad?.provincia === provincia ? field.value : ''}
              onChange={(valor) => setValue('idCiudad', valor, { shouldDirty: true, shouldTouch: true, shouldValidate: true })} onBlur={field.onBlur}
              options={ciudades.data.filter((c) => c.provincia === provincia).map((c) => ({ value: String(c.idCiudad), label: c.nombre }))}
              placeholder="Selecciona la ciudad" disabled={!provincia || ciudades.isError} error={fieldState.error?.message} />
          </Field>
        )} />
        <Field id={id('calle')} label="Calle y número" error={errors.calleDireccion?.message} className="sm:col-span-2">
          <Input id={id('calle')} className={fieldClassName} maxLength={250} {...register('calleDireccion')} {...a11y(id('calle'), errors.calleDireccion?.message)} />
        </Field>
        <Field id={id('referencia')} label="Referencia" error={errors.referenciaUbicacion?.message} className="sm:col-span-2">
          <Input id={id('referencia')} className={fieldClassName} maxLength={250} {...register('referenciaUbicacion')} {...a11y(id('referencia'), errors.referenciaUbicacion?.message)} />
        </Field>
        <Field id={id('sector')} label="Sector" optional error={errors.sector?.message}>
          <Input id={id('sector')} className={fieldClassName} maxLength={50} {...register('sector')} {...a11y(id('sector'), errors.sector?.message)} />
        </Field>
        <Field id={id('postal')} label="Código postal" optional error={errors.codigoPostal?.message}>
          <Input id={id('postal')} className={fieldClassName} inputMode="numeric" maxLength={6} {...register('codigoPostal')} {...a11y(id('postal'), errors.codigoPostal?.message)} />
        </Field>
        <Controller control={control} name="esPrincipal" render={({ field }) => (
          <div className="flex items-center gap-3 sm:col-span-2">
            <Checkbox id={id('principal')} checked={field.value} onCheckedChange={(valor) => field.onChange(valor === true)} disabled={!!direccion?.esPrincipal || pendiente} />
            <Label htmlFor={id('principal')}>Usar como dirección principal</Label>
          </div>
        )} />
      </fieldset>
      {direccion && idCiudad && paisValido && !ciudades.isPending && !ciudades.isError && !ciudad && (
        <p role="alert" className="text-sm text-destructive">La ciudad guardada no está disponible en el catálogo actual. Selecciona una ubicación válida antes de guardar.</p>
      )}
      {direccion?.esPrincipal && <p className="text-sm text-muted-foreground">Para sustituir esta principal, elige otra dirección desde la ficha.</p>}
      {error && <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
        <Button type="button" variant="outline" size="form" disabled={pendiente} onClick={onCancelar}>Cancelar</Button>
        <Button type="submit" size="form" disabled={pendiente || !catalogosDisponibles}>
          {pendiente && <LoaderCircle className="size-4 animate-spin" />}
          {pendiente ? 'Guardando…' : 'Guardar dirección'}
        </Button>
      </div>
    </form>
  )
}
