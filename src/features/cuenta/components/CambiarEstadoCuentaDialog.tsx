import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Loader2, TriangleAlert } from 'lucide-react'

import { cn } from '@/shared/lib'
import {
  Button,
  Dialog,
  DialogClose,
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
  Textarea,
} from '@/shared/ui'
import type { AccionCuenta, Cuenta } from '@/features/cuenta/api/cuenta.contract'
import { useCambiarEstadoCuenta } from '@/features/cuenta/hooks/useCuentas'
import {
  ACCIONES_CUENTA,
  enmascararCuenta,
  formatearMonto,
  puedeCerrarse,
  TIPOS_CUENTA,
} from '@/features/cuenta/lib/estados'
import { EstadoCuentaBadge } from '@/features/cuenta/components/EstadoCuentaBadge'
import {
  crearCambioEstadoSchema,
  type CambioEstadoData,
  type CambioEstadoInput,
} from '@/features/cuenta/schemas/cambiar-estado.schema'

export interface CambioEstadoSeleccion {
  cuenta: Cuenta
  accion: AccionCuenta
}

interface CambiarEstadoCuentaDialogProps {
  seleccion: CambioEstadoSeleccion | null
  onClose: () => void
  onDone: (mensaje: string) => void
}

/** Modal preventivo: explica la consecuencia y pide motivo antes de cambiar el estado */
export function CambiarEstadoCuentaDialog({ seleccion, onClose, onDone }: CambiarEstadoCuentaDialogProps) {
  return (
    <Dialog open={!!seleccion} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        {seleccion && (
          <CambioEstadoForm
            key={`${seleccion.cuenta.idCuenta}-${seleccion.accion}`}
            {...seleccion}
            onDone={onDone}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

const DEFAULT_VALUES: CambioEstadoInput = { motivo: '', observacion: '', confirmacion: '' }

function CambioEstadoForm({ cuenta, accion, onDone }: CambioEstadoSeleccion & { onDone: (mensaje: string) => void }) {
  const config = ACCIONES_CUENTA[accion]
  const ultimosDigitos = cuenta.numeroCuenta.slice(-4)
  const cierre = accion === 'CERRAR'
  const bloqueadaPorSaldo = cierre && !puedeCerrarse(cuenta)

  const mutation = useCambiarEstadoCuenta(cuenta.idCliente)
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CambioEstadoInput, unknown, CambioEstadoData>({
    resolver: zodResolver(crearCambioEstadoSchema(cierre ? ultimosDigitos : null)),
    defaultValues: DEFAULT_VALUES,
  })

  const onSubmit = (datos: CambioEstadoData) =>
    mutation.mutate(
      { idCuenta: cuenta.idCuenta, accion, ...datos },
      {
        onSuccess: (actualizada) =>
          onDone(
            `La ${TIPOS_CUENTA[actualizada.tipoCuenta].toLowerCase()} ${enmascararCuenta(actualizada.numeroCuenta)} quedó ${
              config.destino === 'ACTIVA' ? 'activa' : config.destino.toLowerCase()
            }.`,
          ),
      },
    )

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="flex flex-col gap-5 p-6">
        <DialogHeader className="flex-row items-start gap-4 pr-6">
          <span
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-full',
              config.critica ? 'bg-destructive/15 text-destructive' : 'bg-primary/15 text-link',
            )}
          >
            <config.Icon className="size-5" />
          </span>
          <div className="flex flex-col gap-1.5">
            <DialogTitle className="text-lg font-semibold text-heading">{config.titulo}</DialogTitle>
            <DialogDescription className="leading-relaxed">{config.consecuencias}</DialogDescription>
          </div>
        </DialogHeader>

        {/* Resumen: qué cuenta y a qué estado pasa */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-panel p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="font-semibold text-heading">{TIPOS_CUENTA[cuenta.tipoCuenta]}</span>
              <span className="text-muted-foreground tabular-nums">Nº {cuenta.numeroCuenta}</span>
            </div>
            <div className="text-right">
              <span className="block text-xs text-muted-foreground">Saldo disponible</span>
              <span className="font-semibold text-heading tabular-nums">{formatearMonto(cuenta.saldoDisponible)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 border-t border-border pt-3">
            <EstadoCuentaBadge estado={cuenta.estado} />
            <ArrowRight className="size-4 text-muted-foreground" aria-label="pasa a" />
            <EstadoCuentaBadge estado={config.destino} />
          </div>
        </div>

        {bloqueadaPorSaldo ? (
          <p
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-foreground"
          >
            <TriangleAlert className="mt-0.5 size-[18px] shrink-0 text-destructive" />
            La cuenta tiene un saldo de {formatearMonto(cuenta.saldoDisponible)}. El cliente debe retirarlo o
            transferirlo antes del cierre.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="motivo" className="font-semibold text-heading">
                Motivo
              </Label>
              <Controller
                control={control}
                name="motivo"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="motivo"
                      onBlur={field.onBlur}
                      aria-invalid={!!errors.motivo}
                      aria-describedby={errors.motivo ? 'motivo-error' : undefined}
                      className="w-full rounded-lg data-[size=default]:h-11"
                    >
                      <SelectValue placeholder="Selecciona el motivo" />
                    </SelectTrigger>
                    <SelectContent>
                      {config.motivos.map((motivo) => (
                        <SelectItem key={motivo.value} value={motivo.value}>
                          {motivo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.motivo && (
                <p id="motivo-error" className="text-destructive">
                  {errors.motivo.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="observacion" className="font-semibold text-heading">
                Observación <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Textarea
                id="observacion"
                rows={3}
                maxLength={250}
                placeholder="Detalle para la auditoría, p. ej. número de denuncia o canal de la solicitud"
                aria-invalid={!!errors.observacion}
                className="resize-none rounded-lg"
                {...register('observacion')}
              />
              {errors.observacion && <p className="text-destructive">{errors.observacion.message}</p>}
            </div>

            {cierre && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmacion" className="font-semibold text-heading">
                  Escribe <span className="rounded bg-muted px-1.5 font-mono">{ultimosDigitos}</span> para confirmar el
                  cierre
                </Label>
                <Input
                  id="confirmacion"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  aria-invalid={!!errors.confirmacion}
                  aria-describedby={errors.confirmacion ? 'confirmacion-error' : undefined}
                  className="h-11 rounded-lg font-mono tracking-widest"
                  {...register('confirmacion')}
                />
                {errors.confirmacion && (
                  <p id="confirmacion-error" className="text-destructive">
                    {errors.confirmacion.message}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {mutation.isError && (
          <p role="alert" className="text-destructive">
            {mutation.error.message}
          </p>
        )}
      </div>

      <DialogFooter className="mx-0 mb-0 px-6 py-4">
        <DialogClose asChild>
          <Button type="button" variant="outline" className="h-10 rounded-lg px-4">
            Cancelar
          </Button>
        </DialogClose>
        {!bloqueadaPorSaldo && (
          <Button
            type="submit"
            variant={config.critica ? 'destructive' : 'default'}
            disabled={mutation.isPending}
            className={cn('h-10 rounded-lg px-4 font-semibold', config.critica && 'bg-destructive text-white hover:bg-destructive/90')}
          >
            {mutation.isPending && <Loader2 className="animate-spin" />}
            {mutation.isPending ? 'Procesando…' : config.confirmar}
          </Button>
        )}
      </DialogFooter>
    </form>
  )
}
