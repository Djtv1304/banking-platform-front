import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Ban, CircleCheck, LoaderCircle, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { cn } from '@/shared/lib'
import { Button } from '@/shared/ui'
import { mensajeErrorOperacion } from '@/features/boveda/api/bovedas.api'
import { MOTIVO_MAX, type MovimientoBoveda, type SolicitudMovimiento } from '@/features/boveda/api/bovedas.contract'
import { Campo } from '@/features/boveda/components/Campo'
import { DialogoOperacion, ErrorOperacion } from '@/features/boveda/components/operaciones/DialogoOperacion'
import {
  useAprobarSolicitudMovimiento,
  useCancelarSolicitudMovimiento,
  useRechazarSolicitudMovimiento,
} from '@/features/boveda/hooks/useBovedas'
import { ariaCampo, textareaClassName } from '@/features/boveda/lib/campos'
import { etiquetaMovimiento, formatearMonto, montoConSigno } from '@/features/boveda/lib/formato'

interface AprobarSolicitudDialogProps {
  open: boolean
  solicitud: SolicitudMovimiento
  origen: string
  contraparte: string | null
  /** Código de cada bóveda por id, para nombrar los movimientos ejecutados */
  nombrar: (idBoveda: number) => string
  onCerrar: () => void
}

/**
 * SMV-04 · Aprobar ejecuta el movimiento al instante: se muestra qué se mueve y lo que implica antes
 * de confirmar, y después los movimientos registrados con el saldo que dejó cada uno.
 */
export function AprobarSolicitudDialog({ open, solicitud, origen, contraparte, nombrar, onCerrar }: AprobarSolicitudDialogProps) {
  const aprobacion = useAprobarSolicitudMovimiento()
  const pendiente = aprobacion.isPending

  const cerrar = () => {
    if (pendiente) return
    aprobacion.reset()
    onCerrar()
  }

  if (aprobacion.data) {
    return (
      <DialogoOperacion
        open={open}
        ocupado={false}
        onCerrar={cerrar}
        titulo="Movimiento ejecutado"
        descripcion={`Aprobamos la solicitud N.º ${solicitud.idSolicitudMovimiento} y el efectivo ya se movió.`}
        pie={
          <Button type="button" onClick={cerrar} className="min-h-11 rounded-xl px-6 font-semibold">
            Listo
          </Button>
        }
      >
        <MovimientosEjecutados movimientos={aprobacion.data} nombrar={nombrar} />
      </DialogoOperacion>
    )
  }

  return (
    <DialogoOperacion
      open={open}
      ocupado={pendiente}
      onCerrar={cerrar}
      titulo={`¿Aprobar la solicitud N.º ${solicitud.idSolicitudMovimiento}?`}
      descripcion="Al aprobarla se ejecuta el movimiento en este mismo momento."
      pie={
        <>
          <Button type="button" variant="outline" disabled={pendiente} onClick={cerrar} className="min-h-11 rounded-xl px-6">
            Volver
          </Button>
          <Button
            type="button"
            disabled={pendiente}
            onClick={() => aprobacion.mutate(solicitud.idSolicitudMovimiento)}
            className="min-h-11 rounded-xl px-6 font-semibold"
          >
            {pendiente ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}
            {pendiente ? 'Ejecutando…' : `Aprobar y mover ${formatearMonto(solicitud.monto)}`}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5" aria-busy={pendiente}>
        <div className="flex flex-col gap-1 rounded-2xl border border-border bg-field p-5">
          <p className="text-sm text-muted-foreground">{etiquetaMovimiento(solicitud.tipoMovimiento)}</p>
          <p className="text-3xl font-bold tracking-tight text-heading tabular-nums">{formatearMonto(solicitud.monto)}</p>
          <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
            {origen}
            {contraparte && (
              <>
                <ArrowRight aria-label="hacia" className="size-3.5 text-muted-foreground" />
                {contraparte}
              </>
            )}
          </p>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-5">
          <ShieldAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-destructive" />
          <ul className="flex list-disc flex-col gap-1.5 pl-4 text-sm text-foreground">
            <li>Se registran los movimientos y cambia el saldo {contraparte ? 'de las dos bóvedas' : 'de la bóveda'}.</li>
            <li>Debe aprobarse desde una sesión distinta de la que creó la solicitud.</li>
            <li>No hay una opción para revertir la aprobación desde esta pantalla.</li>
          </ul>
        </div>
        {aprobacion.isError && <ErrorOperacion>{mensajeErrorOperacion(aprobacion.error, 'aprobar solicitudes de movimiento')}</ErrorOperacion>}
      </div>
    </DialogoOperacion>
  )
}

function MovimientosEjecutados({ movimientos, nombrar }: { movimientos: MovimientoBoveda[]; nombrar: (idBoveda: number) => string }) {
  if (movimientos.length === 0) {
    return (
      <p className="flex items-start gap-3 rounded-2xl border border-info/60 bg-info/15 p-5 text-sm text-foreground">
        <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-heading" />
        La solicitud quedó ejecutada. Revisa los movimientos de la bóveda para ver el detalle.
      </p>
    )
  }
  return (
    <ul className="flex flex-col gap-3">
      {movimientos.map((movimiento) => {
        const ingreso = movimiento.naturaleza === 'I'
        const Icono = ingreso ? ArrowDownLeft : ArrowUpRight
        return (
          <li key={movimiento.idMovimiento} className="flex items-center gap-4 rounded-2xl border border-border p-4">
            <span
              aria-hidden
              className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', ingreso ? 'bg-info/40 text-foreground' : 'bg-muted text-muted-foreground')}
            >
              <Icono className="size-4" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-semibold text-heading">{nombrar(movimiento.idBoveda)}</span>
              <span className="text-sm text-muted-foreground tabular-nums">
                {formatearMonto(movimiento.saldoAnterior)} → <span className="font-medium text-heading">{formatearMonto(movimiento.saldoPosterior)}</span>
              </span>
            </span>
            <span className={cn('font-bold whitespace-nowrap tabular-nums', ingreso ? 'text-heading' : 'text-muted-foreground')}>
              <span className="sr-only">{ingreso ? 'Ingreso de ' : 'Egreso de '}</span>
              {montoConSigno(movimiento)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export type ModoMotivo = 'rechazar' | 'cancelar'

const TEXTOS: Record<ModoMotivo, { titulo: string; descripcion: string; boton: string; enviando: string; ayuda: string; permiso: string }> = {
  rechazar: {
    titulo: 'Rechazar solicitud',
    descripcion: 'El movimiento no se ejecuta y la solicitud queda cerrada como rechazada.',
    boton: 'Rechazar solicitud',
    enviando: 'Rechazando…',
    ayuda: 'Quien la solicitó verá este motivo.',
    permiso: 'rechazar solicitudes de movimiento',
  },
  cancelar: {
    titulo: 'Cancelar solicitud',
    descripcion: 'Retira la solicitud antes de que se apruebe. El movimiento no se ejecuta.',
    boton: 'Cancelar solicitud',
    enviando: 'Cancelando…',
    ayuda: 'Queda registrado junto a la solicitud.',
    permiso: 'cancelar solicitudes de movimiento',
  },
}

const motivoFormSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(1, 'Escribe el motivo.')
    .max(MOTIVO_MAX, `Usa hasta ${MOTIVO_MAX} caracteres.`),
})

type MotivoForm = z.input<typeof motivoFormSchema>

interface MotivoSolicitudDialogProps {
  modo: ModoMotivo | null
  solicitud: SolicitudMovimiento
  onCerrar: () => void
  onResuelta: (solicitud: SolicitudMovimiento, modo: ModoMotivo) => void
}

/** SMV-05 y SMV-06 · Rechazar o cancelar exige un motivo */
export function MotivoSolicitudDialog({ modo, solicitud, onCerrar, onResuelta }: MotivoSolicitudDialogProps) {
  const rechazo = useRechazarSolicitudMovimiento()
  const cancelacion = useCancelarSolicitudMovimiento()
  const operacion = modo === 'cancelar' ? cancelacion : rechazo
  const textos = TEXTOS[modo ?? 'rechazar']
  const pendiente = operacion.isPending
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<MotivoForm, unknown, z.output<typeof motivoFormSchema>>({ resolver: zodResolver(motivoFormSchema), defaultValues: { motivo: '' } })
  const error = errors.motivo?.message

  const cerrar = () => {
    if (pendiente) return
    reset({ motivo: '' })
    rechazo.reset()
    cancelacion.reset()
    onCerrar()
  }

  const enviar = async ({ motivo }: { motivo: string }) => {
    if (!modo) return
    try {
      const resuelta = await operacion.mutateAsync({ idSolicitud: solicitud.idSolicitudMovimiento, motivo })
      reset({ motivo: '' })
      operacion.reset()
      onResuelta(resuelta, modo)
    } catch (fallo) {
      const campo = toApiError(fallo).fields.find((item) => item.field.split('.').pop() === 'motivo')
      if (campo) setError('motivo', { message: campo.message }, { shouldFocus: true })
    }
  }

  const Icono = modo === 'cancelar' ? Ban : XCircle

  return (
    <DialogoOperacion
      open={modo !== null}
      ocupado={pendiente}
      onCerrar={cerrar}
      titulo={`${textos.titulo} N.º ${solicitud.idSolicitudMovimiento}`}
      descripcion={textos.descripcion}
      pie={
        <>
          <Button type="button" variant="outline" disabled={pendiente} onClick={cerrar} className="min-h-11 rounded-xl px-6">
            Volver
          </Button>
          <Button type="submit" form="form-motivo-solicitud" variant="destructive" disabled={pendiente} className="min-h-11 rounded-xl px-6 font-semibold">
            {pendiente ? <LoaderCircle className="animate-spin" /> : <Icono />}
            {pendiente ? textos.enviando : textos.boton}
          </Button>
        </>
      }
    >
      <form id="form-motivo-solicitud" onSubmit={(event) => void handleSubmit(enviar)(event)} noValidate aria-busy={pendiente} className="flex flex-col gap-5">
        <Campo id="solicitud-motivo" label="Motivo" error={error} ayuda={textos.ayuda}>
          <textarea
            id="solicitud-motivo"
            rows={4}
            maxLength={MOTIVO_MAX}
            disabled={pendiente}
            placeholder={modo === 'cancelar' ? 'Ej.: Se registró con el desglose equivocado' : 'Ej.: La bóveda destino supera su límite máximo'}
            className={textareaClassName}
            {...ariaCampo('solicitud-motivo', error, true)}
            {...register('motivo')}
          />
        </Campo>
        {operacion.isError && <ErrorOperacion>{mensajeErrorOperacion(operacion.error, textos.permiso)}</ErrorOperacion>}
      </form>
    </DialogoOperacion>
  )
}
