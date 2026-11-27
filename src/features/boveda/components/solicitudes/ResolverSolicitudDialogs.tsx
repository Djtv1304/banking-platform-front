import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Ban, LoaderCircle, XCircle } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { Button } from '@/shared/ui'
import { mensajeErrorOperacion } from '@/features/boveda/api/bovedas.api'
import { MOTIVO_MAX, type SolicitudMovimiento } from '@/features/boveda/api/bovedas.contract'
import { Campo } from '@/features/boveda/components/Campo'
import { DialogoOperacion, ErrorOperacion } from '@/features/boveda/components/operaciones/DialogoOperacion'
import {
  useCancelarSolicitudMovimiento,
  useRechazarSolicitudMovimiento,
} from '@/features/boveda/hooks/useBovedas'
import { ariaCampo, textareaClassName } from '@/features/boveda/lib/campos'

export type ModoMotivo = 'rechazar' | 'cancelar' | 'anular'

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
  anular: {
    titulo: 'Anular la aprobación',
    descripcion: 'Se libera la reserva de efectivo y cupo. Usa esta acción antes del despacho o la recepción física.',
    boton: 'Anular solicitud',
    enviando: 'Anulando…',
    ayuda: 'El motivo queda junto al historial de aprobación.',
    permiso: 'anular solicitudes de movimiento',
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
