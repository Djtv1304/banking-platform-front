import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, Save } from 'lucide-react'

import { toApiError, type ApiError } from '@/shared/api'
import {
  Aviso,
  Button,
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
import type { TasaInteres } from '@/features/catalogos/api/catalogos.contract'
import { Campo, inputClassName } from '@/features/catalogos/components/CampoCatalogo'
import { useCrearTasaInteres, useTiposCredito } from '@/features/catalogos/hooks/useCatalogos'
import { payloadTasa, tasaFormSchema, type TasaFormData, type TasaFormInput } from '@/features/catalogos/lib/tasa-form'

const MENSAJES: Record<string, string> = {
  TASA_SOLAPADA: 'Ya hay una tasa de ese tipo de crédito para ese rango de monto en esas fechas. Ajusta el rango o la vigencia.',
  VIGENCIA_PASADA: 'La vigencia no puede empezar antes de hoy.',
  TIPO_CREDITO_NO_EXISTE: 'El tipo de crédito elegido no existe o está inactivo.',
  DATOS_INVALIDOS: 'Revisa los datos: hay valores que no son válidos.',
}

const mensajeError = (error: ApiError) =>
  error.status === 403 ? 'Solo un administrador puede crear tasas de interés.' : (MENSAJES[error.code] ?? error.message)

const porcentaje = (fraccion: number) => `${(fraccion * 100).toLocaleString('es-EC', { maximumFractionDigits: 2 })} %`
interface NuevaTasaDialogProps {
  abierto: boolean
  onCerrar: () => void
  onGuardado: (mensaje: string) => void
}

/** Alta de una tasa de interés (solo ADMIN). Luego se vincula a subproductos desde Productos */
export function NuevaTasaDialog({ abierto, onCerrar, onGuardado }: NuevaTasaDialogProps) {
  return (
    <Dialog open={abierto} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent className="max-h-[90vh] gap-5 overflow-y-auto p-6 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-heading">Nueva tasa de interés</DialogTitle>
          <DialogDescription>
            No puede cruzarse con otra tasa activa del mismo tipo de crédito en monto y fechas.
          </DialogDescription>
        </DialogHeader>
        {abierto && (
          <FormularioTasa
            onCancelar={onCerrar}
            onGuardado={(t) => onGuardado(`Creamos la tasa de ${porcentaje(t.tasaNominalAnual)} para ${t.nombreTipoCredito}.`)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function FormularioTasa({ onCancelar, onGuardado }: { onCancelar: () => void; onGuardado: (t: TasaInteres) => void }) {
  const tipos = useTiposCredito()
  const crear = useCrearTasaInteres()
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TasaFormInput, unknown, TasaFormData>({
    resolver: zodResolver(tasaFormSchema),
    defaultValues: {
      idTipoCredito: '',
      tasa: '',
      recargoMora: '',
      plazoMaximoMeses: '',
      montoMinimo: '',
      montoMaximo: '',
      vigenciaDesde: '',
      vigenciaHasta: '',
    },
  })

  const texto = (id: string, nombre: Exclude<keyof TasaFormInput, 'idTipoCredito'>, label: string, ayuda?: string, type = 'text') => (
    <Campo id={id} label={label} error={errors[nombre]?.message} ayuda={ayuda}>
      <Input
        id={id}
        type={type}
        inputMode={type === 'text' ? 'decimal' : undefined}
        autoComplete="off"
        className={inputClassName}
        aria-invalid={!!errors[nombre]}
        aria-describedby={errors[nombre] ? `${id}-error` : undefined}
        {...register(nombre)}
      />
    </Campo>
  )

  return (
    <form
      onSubmit={handleSubmit((d) => crear.mutate(payloadTasa(d), { onSuccess: onGuardado }))}
      noValidate
      className="flex flex-col gap-5"
    >
      <Campo id="tasa-tipo" label="Tipo de crédito" error={errors.idTipoCredito?.message}>
        <Controller
          control={control}
          name="idTipoCredito"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger
                id="tasa-tipo"
                onBlur={field.onBlur}
                aria-invalid={!!errors.idTipoCredito}
                className="w-full rounded-xl border-border bg-field px-3 text-base data-[size=default]:h-11"
              >
                <SelectValue placeholder="Elige el tipo" />
              </SelectTrigger>
              <SelectContent>
                {tipos.data.map((t) => (
                  <SelectItem key={t.idTipoCredito} value={String(t.idTipoCredito)}>
                    {t.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-2">
        {texto('tasa-valor', 'tasa', 'Tasa nominal anual (%)', 'Ej.: 16 o 16.5.')}
        {texto('tasa-mora', 'recargoMora', 'Recargo por mora (%)', 'Vacío: 0 %.')}
        {texto('tasa-min', 'montoMinimo', 'Monto mínimo (USD)', 'Vacío: sin mínimo.')}
        {texto('tasa-max', 'montoMaximo', 'Monto máximo (USD)', 'Vacío: sin máximo.')}
        {texto('tasa-plazo', 'plazoMaximoMeses', 'Plazo máximo (meses)')}
        <div />
        {texto('tasa-desde', 'vigenciaDesde', 'Vigente desde', undefined, 'date')}
        {texto('tasa-hasta', 'vigenciaHasta', 'Vigente hasta', 'Vacío: sin fecha de fin.', 'date')}
      </div>
      {crear.error && <Aviso tono="error">{mensajeError(toApiError(crear.error))}</Aviso>}
      <DialogFooter className="-mx-6 -mb-6 px-6">
        <Button type="button" variant="outline" size="lg" onClick={onCancelar} className="rounded-lg px-4">
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={crear.isPending} className="rounded-lg px-4 font-semibold">
          {crear.isPending ? <LoaderCircle className="animate-spin" /> : <Save />}
          Crear tasa
        </Button>
      </DialogFooter>
    </form>
  )
}
