import { useState, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, LoaderCircle, Plus, Save } from 'lucide-react'

import { toApiError, type ApiError } from '@/shared/api'
import {
  Aviso,
  Badge,
  Button,
  Cargando,
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
import { hasAnyRole, useAuthStore } from '@/features/auth'
import { CATALOGOS_ROLES, type TasaInteres } from '@/features/catalogos/api/catalogos.contract'
import { useCrearTasaInteres, useTasasInteres, useTiposCredito } from '@/features/catalogos/hooks/useCatalogos'
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
const dinero = (valor: number | null | undefined) =>
  valor == null ? '—' : valor.toLocaleString('es-EC', { style: 'currency', currency: 'USD' })

const inputClassName = 'h-11 rounded-xl border-border bg-field px-3 text-base md:text-base dark:bg-field dark:scheme-dark'

function Campo({ id, label, error, ayuda, children }: { id: string; label: string; error?: string; ayuda?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-sm font-semibold text-heading">{label}</Label>
      {children}
      {error ? <p id={`${id}-error`} className="text-sm text-destructive">{error}</p> : ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>}
    </div>
  )
}

/**
 * Catálogo de tasas de interés: aquí se crean (solo ADMIN) y luego se vinculan a los subproductos
 * de crédito desde Productos. Una tasa no se edita: la nueva, con su vigencia, reemplaza a la anterior.
 */
export function TasasInteresPage() {
  const roles = useAuthStore((state) => state.user?.roles)
  const esAdmin = hasAnyRole(roles ?? [], CATALOGOS_ROLES.administrar)
  const tasas = useTasasInteres()
  const [creando, setCreando] = useState(false)
  const [confirmacion, setConfirmacion] = useState<string | null>(null)

  const contenido = (() => {
    if (tasas.isError) return <Aviso tono="error">{mensajeError(toApiError(tasas.error))}</Aviso>
    if (tasas.isPending) return <Cargando texto="Cargando tasas…" />
    if (tasas.data.length === 0) return <Aviso>Todavía no hay tasas de interés registradas.</Aviso>
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <caption className="sr-only">Tasas de interés</caption>
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Tipo de crédito</th>
              <th scope="col" className="px-3 py-2 font-medium">Tasa anual</th>
              <th scope="col" className="px-3 py-2 font-medium">Recargo mora</th>
              <th scope="col" className="px-3 py-2 font-medium">Monto</th>
              <th scope="col" className="px-3 py-2 font-medium">Plazo máx.</th>
              <th scope="col" className="px-3 py-2 font-medium">Vigencia</th>
            </tr>
          </thead>
          <tbody>
            {tasas.data.map((t: TasaInteres) => (
              <tr key={t.idTasaInteres} className="border-b border-border last:border-0">
                <td className="px-3 py-2 text-heading">{t.nombreTipoCredito}</td>
                <td className="px-3 py-2 font-semibold text-heading">{porcentaje(t.tasaNominalAnual)}</td>
                <td className="px-3 py-2 text-heading">{porcentaje(t.recargoMoraSobreTasa)}</td>
                <td className="px-3 py-2 text-heading">{dinero(t.montoMinimo)} a {dinero(t.montoMaximo)}</td>
                <td className="px-3 py-2 text-heading">{t.plazoMaximoMeses} meses</td>
                <td className="px-3 py-2 text-heading">
                  {t.vigenciaDesde} {t.vigenciaHasta ? `a ${t.vigenciaHasta}` : 'en adelante'}
                  <Badge className={`ml-2 h-6 px-2.5 ${t.vigente ? 'bg-primary/15 text-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {t.vigente ? 'Vigente' : 'No vigente'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  })()

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">Tasas de interés</h1>
          <p className="mt-2 text-base text-muted-foreground">
            Tasas por tipo de crédito, rango de monto y plazo. Se vinculan a cada subproducto de crédito desde Productos.
          </p>
        </div>
        {esAdmin ? (
          <Button size="lg" onClick={() => setCreando(true)} className="rounded-lg px-4 font-semibold">
            <Plus />
            Nueva tasa
          </Button>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Eye className="size-4" aria-hidden />
            Solo consulta
          </p>
        )}
      </header>

      {confirmacion && <Aviso>{confirmacion}</Aviso>}

      <section aria-label="Tasas de interés" className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        {contenido}
      </section>

      {esAdmin && (
        <Dialog open={creando} onOpenChange={setCreando}>
          <DialogContent className="max-h-[90vh] gap-5 overflow-y-auto p-6 sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-heading">Nueva tasa de interés</DialogTitle>
              <DialogDescription>
                No se puede editar después. No puede cruzarse con otra del mismo tipo de crédito en monto y fechas.
              </DialogDescription>
            </DialogHeader>
            {creando && (
              <FormularioTasa
                onCancelar={() => setCreando(false)}
                onGuardado={(t) => {
                  setCreando(false)
                  setConfirmacion(`Creamos la tasa de ${porcentaje(t.tasaNominalAnual)} para ${t.nombreTipoCredito}.`)
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
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
