import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, Save } from 'lucide-react'

import { toApiError } from '@/shared/api'
import {
  Aviso,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui'
import { useRedes, useTiposCredito } from '@/features/catalogos'
import type { ProductoAdmin } from '@/features/organizacion/api/productos.contract'
import { CampoAgencia as Campo, inputClassName, selectClassName } from '@/features/organizacion/components/CampoAgencia'
import { useActualizarProducto, useCrearProducto, useTiposProducto } from '@/features/organizacion/hooks/useProductosAdmin'
import { a11yCampo } from '@/features/organizacion/lib/agencias'
import {
  campoDelError,
  mensajeErrorProducto,
  payloadCrear,
  payloadEdicion,
  productoFormSchema,
  valoresEdicion,
  VALORES_NUEVO,
  type ProductoFormData,
  type ProductoFormInput,
} from '@/features/organizacion/lib/producto-form'

export type ModoProducto = { tipo: 'crear' } | { tipo: 'editar'; producto: ProductoAdmin }

interface ProductoFormDialogProps {
  /** null = cerrado */
  modo: ModoProducto | null
  onCerrar: () => void
  onGuardado: (mensaje: string) => void
}

/** Alta y edición de un producto (solo ADMIN). Código y tipo no cambian después de crearlo */
export function ProductoFormDialog({ modo, onCerrar, onGuardado }: ProductoFormDialogProps) {
  const editando = modo?.tipo === 'editar'
  return (
    <Dialog open={modo !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="gap-5 p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-heading">
            {modo?.tipo === 'editar' ? `Editar datos comunes de ${modo.producto.codigoProducto}` : 'Nueva linea comercial'}
          </DialogTitle>
          <DialogDescription>
            {editando
              ? 'Los datos se editan solo mientras el producto está en Borrador y sin uso.'
              : 'Elige el producto y su subproducto predefinido. Guarda los datos comunes en Borrador y agrega sus modelos comerciales.'}
          </DialogDescription>
        </DialogHeader>
        {modo && (
          <FormularioProducto
            key={modo.tipo === 'editar' ? modo.producto.idProducto : 'nuevo'}
            modo={modo}
            onCancelar={onCerrar}
            onGuardado={onGuardado}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

interface FormularioProductoProps {
  modo: ModoProducto
  onCancelar: () => void
  onGuardado: (mensaje: string) => void
}

function FormularioProducto({ modo, onCancelar, onGuardado }: FormularioProductoProps) {
  const editando = modo.tipo === 'editar'
  const [inicial] = useState(() => (modo.tipo === 'editar' ? valoresEdicion(modo.producto) : VALORES_NUEVO))
  const [sinCambios, setSinCambios] = useState(false)
  const tipos = useTiposProducto()
  const tiposCredito = useTiposCredito()
  const redes = useRedes()
  const crear = useCrearProducto()
  const actualizar = useActualizarProducto()
  const mutacion = editando ? actualizar : crear

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<ProductoFormInput, unknown, ProductoFormData>({
    resolver: zodResolver(productoFormSchema),
    defaultValues: inicial,
  })
  const tipo = useWatch({ control, name: 'tipoProducto' })

  const errorApi = mutacion.error ? toApiError(mutacion.error) : null
  const errorGeneral = errorApi && !campoDelError(errorApi) ? mensajeErrorProducto(errorApi) : null
  const alFallar = (error: unknown) => {
    const apiError = toApiError(error)
    const campo = campoDelError(apiError)
    if (campo) setError(campo, { message: mensajeErrorProducto(apiError) })
  }

  const guardar = (datos: ProductoFormData) => {
    setSinCambios(false)
    if (modo.tipo === 'crear') {
      crear.mutate(payloadCrear(datos), {
        onSuccess: (p) => onGuardado(`Guardamos los datos comunes de ${p.codigoProducto}. Agrega un modelo comercial en Borrador.`),
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
      { idProducto: modo.producto.idProducto, body },
      { onSuccess: (p) => onGuardado(`Guardamos los cambios del producto ${p.codigoProducto}.`), onError: alFallar },
    )
  }

  const AYUDA_CODIGO = 'De 3 a 10 letras o números. Se edita solo en Borrador.'
  const AYUDA_DESCRIPCION = 'Opcional. Qué es el producto y para quién, en una línea.'

  return (
    <form onSubmit={handleSubmit(guardar)} noValidate className="flex flex-col gap-5">
      {tipos.isError && <Aviso tono="error">No pudimos cargar los tipos de producto.</Aviso>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="producto-codigo" label="Código" error={errors.codigoProducto?.message} ayuda={AYUDA_CODIGO}>
          <Input
            id="producto-codigo"
            autoComplete="off"
            maxLength={10}
            disabled={editando && modo.producto.estadoCatalogo !== 'Borrador'}
            className={`${inputClassName} uppercase`}
            {...a11yCampo('producto-codigo', errors.codigoProducto?.message, AYUDA_CODIGO)}
            {...register('codigoProducto')}
          />
        </Campo>
        <Campo id="producto-familia" label="Producto" error={errors.tipoProducto?.message}>
          <Controller control={control} name="tipoProducto" render={({ field }) => (
            <Select value={field.value} disabled={editando || tipos.isPending || tipos.isError} onValueChange={(valor) => {
              field.onChange(valor)
              const tipoPredefinido = valor === 'Cuenta' ? undefined : tipos.data?.find((t) => t.tipoProducto === valor)
              setValue('idTipoProducto', tipoPredefinido ? String(tipoPredefinido.idTipoProducto) : '')
              setValue('tipoCuenta', '')
              setValue('idTipoCredito', '')
              setValue('idRed', '')
            }}>
              <SelectTrigger id="producto-familia" className={selectClassName} onBlur={field.onBlur}><SelectValue placeholder="Elige el producto" /></SelectTrigger>
              <SelectContent><SelectItem value="Cuenta">Cuentas</SelectItem><SelectItem value="Credito">Creditos</SelectItem><SelectItem value="Tarjeta">Tarjetas</SelectItem></SelectContent>
            </Select>
          )} />
        </Campo>
        {tipo === 'Cuenta' && <Campo id="producto-tipo" label="Subproducto predefinido" error={errors.idTipoProducto?.message}>
          <Controller
            control={control}
            name="idTipoProducto"
            render={({ field }) => (
              <Select value={field.value} onValueChange={(id) => {
                const elegido = tipos.data?.find((t) => String(t.idTipoProducto) === id)
                if (!elegido) return
                field.onChange(id)
                setValue('tipoProducto', elegido.tipoProducto, { shouldValidate: true })
                setValue('tipoCuenta', elegido.tipoCuenta ?? '')
              }} disabled={editando || tipos.isPending || tipos.isError}>
                <SelectTrigger
                  id="producto-tipo"
                  onBlur={field.onBlur}
                  className={selectClassName}
                  {...a11yCampo('producto-tipo', errors.tipoProducto?.message)}
                >
                  <SelectValue placeholder="Elige el subproducto" />
                </SelectTrigger>
                <SelectContent>
                  {tipos.data?.filter((t) => t.tipoProducto === tipo).map((t) => (
                    <SelectItem key={t.idTipoProducto} value={String(t.idTipoProducto)}>
                      {t.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Campo>}
        <div className="sm:col-span-2">
          <Campo id="producto-nombre" label="Nombre" error={errors.nombreProducto?.message}>
            <Input
              id="producto-nombre"
              autoComplete="off"
              maxLength={100}
              className={inputClassName}
              {...a11yCampo('producto-nombre', errors.nombreProducto?.message)}
              {...register('nombreProducto')}
            />
          </Campo>
        </div>
        <div className="sm:col-span-2">
          <Campo id="producto-descripcion" label="Descripción" error={errors.descripcion?.message} ayuda={AYUDA_DESCRIPCION}>
            <Input
              id="producto-descripcion"
              autoComplete="off"
              maxLength={250}
              className={inputClassName}
              {...a11yCampo('producto-descripcion', errors.descripcion?.message, AYUDA_DESCRIPCION)}
              {...register('descripcion')}
            />
          </Campo>
        </div>

        {tipo === 'Cuenta' && (
          <>
            <Campo id="producto-tipo-cuenta" label="Tipo de cuenta" error={errors.tipoCuenta?.message}>
              <Controller
                control={control}
                name="tipoCuenta"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled>
                    <SelectTrigger
                      id="producto-tipo-cuenta"
                      onBlur={field.onBlur}
                      className={selectClassName}
                      {...a11yCampo('producto-tipo-cuenta', errors.tipoCuenta?.message)}
                    >
                      <SelectValue placeholder="Elige" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ahorro">Ahorro</SelectItem>
                      <SelectItem value="Corriente">Corriente</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Campo>
            <Campo
              id="producto-monto"
              label="Monto mínimo de apertura (USD)"
              error={errors.montoAperturaMinimo?.message}
              ayuda="Vacío = 0."
            >
              <Input
                id="producto-monto"
                inputMode="decimal"
                autoComplete="off"
                className={inputClassName}
                {...a11yCampo('producto-monto', errors.montoAperturaMinimo?.message, 'Vacío = 0.')}
                {...register('montoAperturaMinimo')}
              />
            </Campo>
          </>
        )}

        {tipo === 'Credito' && (
          <div className="sm:col-span-2">
            <Campo id="producto-tipo-credito" label="Subproducto de credito" error={errors.idTipoCredito?.message}>
              <Controller
                control={control}
                name="idTipoCredito"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={editando}>
                    <SelectTrigger
                      id="producto-tipo-credito"
                      onBlur={field.onBlur}
                      className={selectClassName}
                      {...a11yCampo('producto-tipo-credito', errors.idTipoCredito?.message)}
                    >
                      <SelectValue placeholder={tiposCredito.isPending ? 'Cargando…' : 'Elige el tipo de crédito'} />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposCredito.data.map((t) => (
                        <SelectItem key={t.idTipoCredito} value={String(t.idTipoCredito)}>
                          {t.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Campo>
          </div>
        )}

        {tipo === 'Tarjeta' && (
          <div className="sm:col-span-2">
            <Campo id="producto-red" label="Red" error={errors.idRed?.message}>
              <Controller
                control={control}
                name="idRed"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={editando}>
                    <SelectTrigger
                      id="producto-red"
                      onBlur={field.onBlur}
                      className={selectClassName}
                      {...a11yCampo('producto-red', errors.idRed?.message)}
                    >
                      <SelectValue placeholder={redes.isPending ? 'Cargando…' : 'Elige la red'} />
                    </SelectTrigger>
                    <SelectContent>
                      {redes.data.map((r) => (
                        <SelectItem key={r.idRed} value={String(r.idRed)}>
                          {r.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Campo>
          </div>
        )}

        <div className="flex items-center gap-3 sm:col-span-2">
          <Controller
            control={control}
            name="permiteOperacionesPresenciales"
            render={({ field }) => (
              <Checkbox
                id="producto-presencial"
                checked={field.value}
                onCheckedChange={(v) => field.onChange(v === true)}
              />
            )}
          />
          <Label htmlFor="producto-presencial" className="text-sm text-heading">
            Permite operaciones en ventanilla
          </Label>
        </div>
      </div>

      {sinCambios && <Aviso>No cambiaste ningún dato: no hay nada que guardar.</Aviso>}
      {errorGeneral && <Aviso tono="error">{errorGeneral}</Aviso>}

      <DialogFooter className="-mx-6 -mb-6 px-6">
        <Button type="button" variant="outline" size="lg" onClick={onCancelar} className="rounded-lg px-4">
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={mutacion.isPending} className="rounded-lg px-4 font-semibold">
          {mutacion.isPending ? <LoaderCircle className="animate-spin" /> : <Save />}
          {editando ? 'Guardar cambios' : 'Guardar datos comunes'}
        </Button>
      </DialogFooter>
    </form>
  )
}
