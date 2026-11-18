import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, Save } from 'lucide-react'

import { toApiError } from '@/shared/api'
import {
  Aviso,
  Button,
  Cargando,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui'
import { useCiudades, type Ciudad } from '@/features/catalogos'
import type { AgenciaDetalle } from '@/features/organizacion/api/agencias.contract'
import { CampoAgencia, inputClassName, selectClassName } from '@/features/organizacion/components/CampoAgencia'
import { useActualizarAgencia, useAgenciaDetalle, useAgenciasAdmin, useCrearAgencia } from '@/features/organizacion/hooks/useAgenciasAdmin'
import {
  campoDelError,
  esquemaTipoAgencia,
  soloPermitirSucursal,
  mensajeErrorAgencia,
  payloadCrear,
  payloadEdicion,
  valoresEdicion,
  VALORES_NUEVA,
  type AgenciaFormData,
  type AgenciaFormInput,
} from '@/features/organizacion/lib/agencia-form'
import { a11yCampo } from '@/features/organizacion/lib/agencias'

const AYUDA_CODIGO = 'Hasta 10 letras, números o guiones.'

export type ModoAgencia = { tipo: 'crear' } | { tipo: 'editar'; agencia: AgenciaDetalle }

interface AgenciaFormDialogProps {
  /** null = cerrado */
  modo: ModoAgencia | null
  onCerrar: () => void
  onGuardado: (mensaje: string) => void
  onRestaurarFoco: () => void
}

/** ORG-01 (alta) y ORG-02 (edición de datos). Las agencias son de Ecuador */
export function AgenciaFormDialog({ modo, onCerrar, onGuardado, onRestaurarFoco }: AgenciaFormDialogProps) {
  const ciudades = useCiudades('ECU')
  const agencias = useAgenciasAdmin()
  const editando = modo?.tipo === 'editar'
  const crear = useCrearAgencia()
  const actualizar = useActualizarAgencia()
  const guardando = editando ? actualizar.isPending : crear.isPending
  const cerrar = () => {
    crear.reset()
    actualizar.reset()
    onCerrar()
  }
  const detalle = useAgenciaDetalle(modo?.tipo === 'editar' ? modo.agencia.idAgencia : null)

  const contenido = (() => {
    if (!modo) return null
    if (agencias.isError) {
      return (
        <Aviso tono="error">
          No pudimos comprobar si ya existe una Matriz.
          <Button type="button" variant="outline" onClick={() => void agencias.refetch()} disabled={agencias.isFetching}>
            Reintentar
          </Button>
        </Aviso>
      )
    }
    if (agencias.isPending) return <Cargando texto="Comprobando agencias…" />
    if (ciudades.isError) return <Aviso tono="error">{toApiError(ciudades.error).message}</Aviso>
    if (editando && detalle.isError) return <Aviso tono="error">{mensajeErrorAgencia(toApiError(detalle.error))}</Aviso>
    if (ciudades.isPending) return <Cargando texto="Cargando ciudades…" />
    if (editando && detalle.isPending) return <Cargando texto="Cargando la agencia…" />
    return (
      <FormularioAgencia
        key={modo.tipo === 'editar' ? modo.agencia.idAgencia : 'nueva'}
        modo={modo}
        crear={crear}
        actualizar={actualizar}
        detalle={detalle.data ?? null}
        ciudades={ciudades.data}
        soloSucursal={soloPermitirSucursal(agencias.data, detalle.data?.tipoAgencia)}
        onCancelar={cerrar}
        onGuardado={(mensaje) => { crear.reset(); actualizar.reset(); onGuardado(mensaje) }}
      />
    )
  })()

  return (
    <Dialog open={modo !== null} onOpenChange={(abierto) => !abierto && !guardando && cerrar()}>
      <DialogContent showCloseButton={!guardando} onCloseAutoFocus={(event) => { event.preventDefault(); onRestaurarFoco() }} className="gap-5 p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-heading">
            {modo?.tipo === 'editar' ? `Editar agencia ${modo.agencia.codigo}` : 'Nueva agencia'}
          </DialogTitle>
          <DialogDescription>
            {editando
              ? 'Cambia solo lo que necesites. El ID de la agencia no cambia.'
              : 'La agencia se crea inactiva. El sistema asigna su ID automáticamente al guardar.'}
          </DialogDescription>
        </DialogHeader>
        {contenido}
      </DialogContent>
    </Dialog>
  )
}

interface FormularioAgenciaProps {
  modo: ModoAgencia
  crear: ReturnType<typeof useCrearAgencia>
  actualizar: ReturnType<typeof useActualizarAgencia>
  /** Solo al editar: lo que devolvió GET /agencias/{id} */
  detalle: AgenciaDetalle | null
  ciudades: Ciudad[]
  soloSucursal: boolean
  onCancelar: () => void
  onGuardado: (mensaje: string) => void
}

function FormularioAgencia({ modo, crear, actualizar, detalle, ciudades, soloSucursal, onCancelar, onGuardado }: FormularioAgenciaProps) {
  const editando = modo.tipo === 'editar'
  // Se calcula una vez al abrir: es la base para saber qué cambió
  const [inicial] = useState(() => (detalle ? valoresEdicion(detalle) : {
    ...VALORES_NUEVA,
    tipoAgencia: soloSucursal ? 'Sucursal' : '',
  }))
  const [sinCambios, setSinCambios] = useState(false)
  const mutacion = editando ? actualizar : crear

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<AgenciaFormInput, unknown, AgenciaFormData>({
    resolver: zodResolver(esquemaTipoAgencia(soloSucursal)),
    defaultValues: inicial,
  })

  // Si el catálogo se actualiza, conserva el resto del borrador.
  useEffect(() => {
    if (soloSucursal) setValue('tipoAgencia', 'Sucursal', { shouldValidate: true })
  }, [soloSucursal, setValue])

  // Si el error del backend corresponde a un campo, se muestra junto a él
  const errorApi = mutacion.error ? toApiError(mutacion.error) : null
  const errorGeneral = errorApi && !campoDelError(errorApi) ? mensajeErrorAgencia(errorApi) : null
  const alFallar = (error: unknown) => {
    const apiError = toApiError(error)
    const campo = campoDelError(apiError)
    if (campo) setError(campo, { message: mensajeErrorAgencia(apiError) }, { shouldFocus: true })
  }

  const guardar = (datos: AgenciaFormData) => {
    setSinCambios(false)
    if (modo.tipo === 'crear') {
      crear.mutate(payloadCrear(datos), {
        onSuccess: (agencia) => onGuardado(`Creamos la agencia ${agencia.codigo} (ID ${agencia.idAgencia}).`),
        onError: alFallar,
      })
      return
    }
    const body = payloadEdicion(inicial, datos)
    if (Object.keys(body).length === 0) {
      setSinCambios(true)
      return
    }
    actualizar.mutate(
      { idAgencia: modo.agencia.idAgencia, body },
      { onSuccess: (agencia) => onGuardado(`Guardamos los cambios de la agencia ${agencia.codigo}.`), onError: alFallar },
    )
  }

  const opcional = editando ? 'Opcional. Si lo vacías, se borra.' : 'Opcional.'

  return (
    <form onSubmit={handleSubmit(guardar)} noValidate className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoAgencia id="agencia-codigo" label="Código" error={errors.codigo?.message} ayuda={AYUDA_CODIGO}>
          <Input
            id="agencia-codigo"
            autoComplete="off"
            maxLength={10}
            className={`${inputClassName} uppercase`}
            {...a11yCampo('agencia-codigo', errors.codigo?.message, AYUDA_CODIGO)}
            {...register('codigo')}
          />
        </CampoAgencia>
        <CampoAgencia id="agencia-tipo" label="Tipo" error={errors.tipoAgencia?.message}>
          <Controller
            control={control}
            name="tipoAgencia"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={soloSucursal}>
                <SelectTrigger id="agencia-tipo" ref={field.ref} onBlur={field.onBlur} className={selectClassName} {...a11yCampo('agencia-tipo', errors.tipoAgencia?.message)}>
                  <SelectValue placeholder="Elige el tipo" />
                </SelectTrigger>
                <SelectContent>
                  {!soloSucursal && <SelectItem value="Matriz">Matriz</SelectItem>}
                  <SelectItem value="Sucursal">Sucursal</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {soloSucursal && <p className="text-sm text-muted-foreground">Ya existe una Matriz. Esta agencia solo puede ser Sucursal.</p>}
        </CampoAgencia>
        <CampoAgencia id="agencia-ciudad" label="Ciudad" error={errors.idCiudad?.message}>
          <Controller
            control={control}
            name="idCiudad"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="agencia-ciudad"
                  onBlur={field.onBlur}
                  className={selectClassName}
                  {...a11yCampo('agencia-ciudad', errors.idCiudad?.message)}
                >
                  <SelectValue placeholder="Elige la ciudad" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-72">
                  {ciudades.map((ciudad) => (
                    <SelectItem key={ciudad.idCiudad} value={String(ciudad.idCiudad)}>
                      {ciudad.nombre} ({ciudad.provincia})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </CampoAgencia>
        <CampoAgencia id="agencia-telefono" label="Teléfono" error={errors.telefono?.message} ayuda={opcional}>
          <Input
            id="agencia-telefono"
            type="tel"
            autoComplete="off"
            maxLength={15}
            className={inputClassName}
            {...a11yCampo('agencia-telefono', errors.telefono?.message, opcional)}
            {...register('telefono')}
          />
        </CampoAgencia>
        <div className="sm:col-span-2">
          <CampoAgencia id="agencia-direccion" label="Dirección" error={errors.direccion?.message} ayuda={opcional}>
            <Input
              id="agencia-direccion"
              autoComplete="off"
              maxLength={250}
              className={inputClassName}
              {...a11yCampo('agencia-direccion', errors.direccion?.message, opcional)}
              {...register('direccion')}
            />
          </CampoAgencia>
        </div>
      </div>

      {sinCambios && <Aviso>No cambiaste ningún dato: no hay nada que guardar.</Aviso>}
      {errorGeneral && <Aviso tono="error">{errorGeneral}</Aviso>}

      <DialogFooter className="-mx-6 -mb-6 px-6">
        <Button type="button" variant="outline" size="lg" onClick={onCancelar} disabled={mutacion.isPending} className="rounded-lg px-4">
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={mutacion.isPending} className="rounded-lg px-4 font-semibold">
          {mutacion.isPending ? <LoaderCircle className="animate-spin" /> : <Save />}
          {mutacion.isPending ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear agencia'}
        </Button>
      </DialogFooter>
    </form>
  )
}
