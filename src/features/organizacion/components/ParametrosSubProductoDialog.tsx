import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, Save } from 'lucide-react'

import { toApiError } from '@/shared/api'
import {
  Aviso,
  Button,
  Cargando,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/shared/ui'
import { useSistemasAmortizacion, useTasasInteres, type TasaInteres } from '@/features/catalogos'
import type {
  ProductoAdmin,
  SubProductoAdmin,
  SubProductoParametros,
} from '@/features/organizacion/api/productos.contract'
import { CampoAgencia as Campo, inputClassName } from '@/features/organizacion/components/CampoAgencia'
import { useGuardarParametros, useParametrosSubProducto } from '@/features/organizacion/hooks/useProductosAdmin'
import { a11yCampo } from '@/features/organizacion/lib/agencias'
import {
  alternar,
  dinero,
  parametrosFormSchema,
  porcentaje,
  valoresParametros,
  type ParametrosFormData,
  type ParametrosFormInput,
} from '@/features/organizacion/lib/parametros-form'
import { mensajeErrorProducto } from '@/features/organizacion/lib/producto-form'

interface ParametrosSubProductoDialogProps {
  producto: ProductoAdmin
  /** Subproducto de crédito a parametrizar; null = cerrado */
  subproducto: SubProductoAdmin | null
  /** ASESOR lo ve en solo lectura */
  soloLectura: boolean
  onCerrar: () => void
  onGuardado: (mensaje: string) => void
}

/**
 * Parámetros de un subproducto de crédito: límites de monto y plazo, y qué tasas de interés y
 * sistemas de amortización ofrece. Las tasas y los sistemas se crean en Catálogos; aquí solo se
 * vinculan con un checklist.
 */
export function ParametrosSubProductoDialog({
  producto,
  subproducto,
  soloLectura,
  onCerrar,
  onGuardado,
}: ParametrosSubProductoDialogProps) {
  const parametros = useParametrosSubProducto(subproducto?.idSubProducto ?? null)

  return (
    <Dialog open={subproducto !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="max-h-[90vh] gap-5 overflow-y-auto p-6 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-heading">
            Parámetros de {subproducto?.nombreSubProducto ?? 'subproducto'}
          </DialogTitle>
          <DialogDescription>
            Límites del crédito y las tasas y tablas de amortización que se pueden ofrecer. Las tasas se crean en
            Productos y Catálogos › Tasas de interés.
          </DialogDescription>
        </DialogHeader>
        {subproducto &&
          (parametros.isError ? (
            <Aviso tono="error">{mensajeErrorProducto(toApiError(parametros.error))}</Aviso>
          ) : parametros.isPending ? (
            <Cargando texto="Cargando parámetros…" />
          ) : (
            <Formulario
              key={subproducto.idSubProducto}
              producto={producto}
              subproducto={subproducto}
              inicial={parametros.data}
              soloLectura={soloLectura}
              onCancelar={onCerrar}
              onGuardado={onGuardado}
            />
          ))}
      </DialogContent>
    </Dialog>
  )
}

function rangoTasa(t: TasaInteres) {
  const vigencia = t.vigenciaHasta ? `${t.vigenciaDesde} a ${t.vigenciaHasta}` : `desde ${t.vigenciaDesde}`
  return `${dinero(t.montoMinimo)} a ${dinero(t.montoMaximo)} · hasta ${t.plazoMaximoMeses} meses · ${vigencia}`
}

function Formulario({
  producto,
  subproducto,
  inicial,
  soloLectura,
  onCancelar,
  onGuardado,
}: {
  producto: ProductoAdmin
  subproducto: SubProductoAdmin
  inicial: SubProductoParametros
  soloLectura: boolean
  onCancelar: () => void
  onGuardado: (mensaje: string) => void
}) {
  // Solo las tasas del tipo de crédito del producto: el backend rechaza las demás
  const tasas = useTasasInteres(producto.idTipoCredito ?? undefined)
  const sistemas = useSistemasAmortizacion()
  const guardar = useGuardarParametros()
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ParametrosFormInput, unknown, ParametrosFormData>({
    resolver: zodResolver(parametrosFormSchema),
    defaultValues: valoresParametros(inicial),
    disabled: soloLectura,
  })

  const enviar = (datos: ParametrosFormData) =>
    guardar.mutate(
      { idSubProducto: subproducto.idSubProducto, body: datos },
      { onSuccess: () => onGuardado(`Guardamos los parámetros de ${subproducto.codigoSubProducto}.`) },
    )

  const campoNumero = (
    id: string,
    nombre: 'montoMinimo' | 'montoMaximo' | 'plazoMinimoMeses' | 'plazoMaximoMeses',
    label: string,
    ayuda: string,
  ) => (
    <Campo id={id} label={label} error={errors[nombre]?.message} ayuda={ayuda}>
      <Input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        className={inputClassName}
        {...a11yCampo(id, errors[nombre]?.message, ayuda)}
        {...register(nombre)}
      />
    </Campo>
  )

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="flex flex-col gap-6">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-semibold text-heading">Límites</legend>
        {campoNumero('par-monto-min', 'montoMinimo', 'Monto mínimo (USD)', 'Vacío: sin mínimo.')}
        {campoNumero('par-monto-max', 'montoMaximo', 'Monto máximo (USD)', 'Ej.: 10000. Vacío: sin máximo.')}
        {campoNumero('par-plazo-min', 'plazoMinimoMeses', 'Plazo mínimo (meses)', 'Vacío: sin mínimo.')}
        {campoNumero('par-plazo-max', 'plazoMaximoMeses', 'Plazo máximo (meses)', 'Vacío: el de la tasa.')}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold text-heading">
          Tasas de interés{producto.nombreTipoCredito ? ` de ${producto.nombreTipoCredito}` : ''}
        </legend>
        {tasas.isPending ? (
          <Cargando texto="Cargando tasas…" />
        ) : tasas.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay tasas para este tipo de crédito. Créalas en Productos y Catálogos › Tasas de interés.
          </p>
        ) : (
          <Controller
            control={control}
            name="tasasInteres"
            render={({ field }) => (
              <ul className="flex flex-col gap-2">
                {tasas.data.map((t) => {
                  const id = `par-tasa-${t.idTasaInteres}`
                  return (
                    <li key={t.idTasaInteres} className="flex items-start gap-3 rounded-xl border border-border p-3">
                      <Checkbox
                        id={id}
                        className="mt-0.5"
                        disabled={soloLectura}
                        checked={field.value.includes(t.idTasaInteres)}
                        onCheckedChange={(v) => field.onChange(alternar(field.value, t.idTasaInteres, v === true))}
                      />
                      <Label htmlFor={id} className="flex flex-col items-start gap-0.5 text-sm text-heading">
                        <span className="font-semibold">
                          {porcentaje(t.tasaNominalAnual)} anual
                          {!t.vigente && <span className="ml-2 text-xs font-normal text-muted-foreground">(no vigente hoy)</span>}
                        </span>
                        <span className="text-xs font-normal text-muted-foreground">{rangoTasa(t)}</span>
                      </Label>
                    </li>
                  )
                })}
              </ul>
            )}
          />
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold text-heading">Tablas de amortización</legend>
        <Controller
          control={control}
          name="sistemasAmortizacion"
          render={({ field }) => (
            <ul className="grid gap-2 sm:grid-cols-2">
              {sistemas.data.map((s) => {
                const id = `par-sistema-${s.codigo}`
                return (
                  <li key={s.codigo} className="flex items-start gap-3 rounded-xl border border-border p-3">
                    <Checkbox
                      id={id}
                      className="mt-0.5"
                      disabled={soloLectura}
                      checked={field.value.includes(s.codigo)}
                      onCheckedChange={(v) => field.onChange(alternar(field.value, s.codigo, v === true))}
                    />
                    <Label htmlFor={id} className="flex flex-col items-start gap-0.5 text-sm text-heading">
                      <span className="font-semibold">{s.nombre}</span>
                      <span className="text-xs font-normal text-muted-foreground">{s.descripcion}</span>
                    </Label>
                  </li>
                )
              })}
            </ul>
          )}
        />
      </fieldset>

      {guardar.error && <Aviso tono="error">{mensajeErrorProducto(toApiError(guardar.error))}</Aviso>}
      <DialogFooter className="-mx-6 -mb-6 px-6">
        <Button type="button" variant="outline" size="lg" onClick={onCancelar} className="rounded-lg px-4">
          {soloLectura ? 'Cerrar' : 'Cancelar'}
        </Button>
        {!soloLectura && (
          <Button type="submit" size="lg" disabled={guardar.isPending} className="rounded-lg px-4 font-semibold">
            {guardar.isPending ? <LoaderCircle className="animate-spin" /> : <Save />}
            Guardar parámetros
          </Button>
        )}
      </DialogFooter>
    </form>
  )
}
