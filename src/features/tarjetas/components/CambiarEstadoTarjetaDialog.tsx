import type { ReactNode } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, TriangleAlert } from 'lucide-react'

import { toApiError } from '@/shared/api'
import {
  Aviso,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui'
import type { Tarjeta } from '@/features/tarjetas/api/tarjetas.contract'
import { Field, SelectField } from '@/features/tarjetas/components/form-fields'
import { useCambiarEstadoTarjeta } from '@/features/tarjetas/hooks/useAccionesTarjeta'
import {
  type AccionEstado,
  bloqueoFormSchema,
  type BloqueoFormInput,
  CAUSAS_BLOQUEO,
  esIrreversible,
  MAX_DETALLE_BLOQUEO,
  MAX_MOTIVO,
  mensajeCambioEstado,
  mensajeErrorAccionTarjeta,
  motivoFormSchema,
  type MotivoFormData,
  type MotivoFormInput,
} from '@/features/tarjetas/lib/acciones-tarjeta'
import { a11y, textareaClassName } from '@/features/tarjetas/lib/formulario'

interface CambiarEstadoTarjetaDialogProps {
  tarjeta: Tarjeta
  /** Cambio que se confirma; null = cerrado */
  accion: AccionEstado | null
  onCerrar: () => void
  onCambiado: (mensaje: string) => void
}

/** TAR-04 · Confirma el cambio de estado y pide su motivo, que queda en el historial */
export function CambiarEstadoTarjetaDialog({ tarjeta, accion, onCerrar, onCambiado }: CambiarEstadoTarjetaDialogProps) {
  return (
    <Dialog open={accion !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="gap-5 p-6 sm:max-w-lg">
        {accion && (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-heading">
                {accion.etiqueta} · {tarjeta.numeroEnmascarado}
              </DialogTitle>
              <DialogDescription>
                La tarjeta pasará de {tarjeta.estadoActual} a {accion.destino}. El motivo queda registrado en su historial.
              </DialogDescription>
            </DialogHeader>
            {esIrreversible(accion.destino) && (
              <p role="note" className="flex items-start gap-2 rounded-xl bg-brand-amber/15 px-4 py-3 text-sm text-heading">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-brand-amber" />
                Este cambio no se puede deshacer: la tarjeta no volverá a usarse.
              </p>
            )}
            <FormularioEstado key={accion.destino} tarjeta={tarjeta} accion={accion} onCancelar={onCerrar} onCambiado={onCambiado} />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

interface FormularioEstadoProps {
  tarjeta: Tarjeta
  accion: AccionEstado
  onCancelar: () => void
  onCambiado: (mensaje: string) => void
}

function FormularioEstado({ tarjeta, accion, onCancelar, onCambiado }: FormularioEstadoProps) {
  const cambiar = useCambiarEstadoTarjeta(tarjeta.idTarjeta)

  const enviar = ({ motivo }: MotivoFormData) =>
    cambiar.mutate(
      { estado: accion.destino, motivo },
      { onSuccess: (actual) => onCambiado(mensajeCambioEstado(accion.destino, actual, new Date())) },
    )

  const pie = (
    <>
      {cambiar.isError && <Aviso tono="error">{mensajeErrorAccionTarjeta(toApiError(cambiar.error), 'estado')}</Aviso>}
      <DialogFooter className="-mx-6 -mb-6 px-6">
        <Button type="button" variant="outline" size="lg" onClick={onCancelar} className="rounded-lg px-4">
          Volver
        </Button>
        <Button
          type="submit"
          size="lg"
          variant={esIrreversible(accion.destino) || accion.destino === 'Bloqueada' ? 'destructive' : 'default'}
          disabled={cambiar.isPending}
          className="rounded-lg px-4 font-semibold"
        >
          {cambiar.isPending && <LoaderCircle className="animate-spin" />}
          {accion.etiqueta}
        </Button>
      </DialogFooter>
    </>
  )

  return accion.destino === 'Bloqueada' ? (
    <FormularioBloqueo onEnviar={enviar}>{pie}</FormularioBloqueo>
  ) : (
    <FormularioMotivo onEnviar={enviar}>{pie}</FormularioMotivo>
  )
}

interface FormularioProps {
  onEnviar: (data: MotivoFormData) => void
  children: ReactNode
}

function Contador({ actual, maximo }: { actual: number; maximo: number }) {
  return (
    <p className="text-right text-xs text-muted-foreground tabular-nums" aria-live="polite">
      {actual}/{maximo}
    </p>
  )
}

function FormularioMotivo({ onEnviar, children }: FormularioProps) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MotivoFormInput, unknown, MotivoFormData>({
    resolver: zodResolver(motivoFormSchema),
    defaultValues: { motivo: '' },
  })
  const error = errors.motivo?.message
  const motivo = useWatch({ control, name: 'motivo' })

  return (
    <form onSubmit={handleSubmit(onEnviar)} noValidate className="flex flex-col gap-5">
      <Field id="estado-motivo" label="Motivo" error={error}>
        <textarea
          id="estado-motivo"
          rows={4}
          maxLength={MAX_MOTIVO}
          aria-required
          className={textareaClassName}
          placeholder="Por qué cambias el estado de la tarjeta"
          {...a11y('estado-motivo', error)}
          {...register('motivo')}
        />
      </Field>
      <Contador actual={motivo.length} maximo={MAX_MOTIVO} />
      {children}
    </form>
  )
}

const OPCIONES_CAUSA = CAUSAS_BLOQUEO.map((causa) => ({ value: causa, label: causa }))

/** Bloqueo inmediato (JPRFM-2026-048-T): causa obligatoria y detalle opcional → «Causa: detalle» */
function FormularioBloqueo({ onEnviar, children }: FormularioProps) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BloqueoFormInput, unknown, MotivoFormData>({
    resolver: zodResolver(bloqueoFormSchema),
    defaultValues: { causa: '', detalle: '' },
  })
  const errorDetalle = errors.detalle?.message
  const detalle = useWatch({ control, name: 'detalle' })

  return (
    <form onSubmit={handleSubmit(onEnviar)} noValidate className="flex flex-col gap-5">
      <Field id="bloqueo-causa" label="Causa del bloqueo" error={errors.causa?.message}>
        <Controller
          control={control}
          name="causa"
          render={({ field }) => (
            <SelectField
              id="bloqueo-causa"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              options={OPCIONES_CAUSA}
              placeholder="Elige la causa"
              error={errors.causa?.message}
            />
          )}
        />
      </Field>
      <Field id="bloqueo-detalle" label="Detalle (opcional)" error={errorDetalle}>
        <textarea
          id="bloqueo-detalle"
          rows={3}
          maxLength={MAX_DETALLE_BLOQUEO}
          className={textareaClassName}
          placeholder="Dónde o cómo ocurrió, quién lo reportó…"
          {...a11y('bloqueo-detalle', errorDetalle)}
          {...register('detalle')}
        />
      </Field>
      <Contador actual={detalle.length} maximo={MAX_DETALLE_BLOQUEO} />
      {children}
    </form>
  )
}
