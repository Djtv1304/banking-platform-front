import { useId, useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleAlert, LoaderCircle } from 'lucide-react'

import { esquemaMotivo, MOTIVO_MAXIMO_POR_DEFECTO, minimoEfectivo } from '@/shared/lib'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'

export interface MotivoConfirmacion {
  obligatorio: boolean
  /** Con motivo obligatorio, 10 por defecto */
  minimo?: number
  /** 500 por defecto */
  maximo?: number
  /** «Motivo» por defecto */
  etiqueta?: string
}

export interface DialogoConfirmacionProps {
  abierto: boolean
  onAbiertoChange: (abierto: boolean) => void
  titulo: string
  descripcion: string
  textoConfirmar: string
  /** Acción difícil de revertir: el botón se pinta de peligro y, sin motivo, el foco empieza en «Cancelar» */
  destructiva?: boolean
  /** Sin esta prop no hay campo de motivo */
  motivo?: MotivoConfirmacion
  /**
   * Recibe el motivo ya recortado (`undefined` si no hay campo o quedó vacío). No cierra el diálogo: quien llama lo cierra
   * con `onAbiertoChange(false)` cuando la acción termine, y es quien muestra sus propios errores.
   */
  onConfirmar: (motivo?: string) => void | Promise<void>
  /** Acción en curso: bloquea los controles y el cierre */
  procesando?: boolean
}

/**
 * Diálogo de confirmación con motivo opcional u obligatorio (E0-07).
 * Radix aporta el foco atrapado, Esc y el regreso del foco al disparador; aquí se fija el foco inicial y se valida el motivo.
 */
export function DialogoConfirmacion(props: DialogoConfirmacionProps) {
  const { abierto, onAbiertoChange, procesando = false } = props
  const contenido = useRef<HTMLDivElement>(null)

  return (
    <Dialog open={abierto} onOpenChange={(siguiente) => (siguiente || !procesando) && onAbiertoChange(siguiente)}>
      <DialogContent
        ref={contenido}
        showCloseButton={!procesando}
        className="gap-5 p-6 sm:max-w-lg"
        onOpenAutoFocus={(evento) => {
          // El destino lo marca `data-autofocus`: el campo del motivo o, si no hay, «Cancelar»
          evento.preventDefault()
          contenido.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
        }}
        onEscapeKeyDown={(evento) => procesando && evento.preventDefault()}
        onInteractOutside={(evento) => procesando && evento.preventDefault()}
      >
        <FormularioConfirmacion {...props} />
      </DialogContent>
    </Dialog>
  )
}

/** Contenido del diálogo. Se exporta sólo para probarlo sin el portal; úsalo siempre a través de `DialogoConfirmacion` */
export function FormularioConfirmacion({
  onAbiertoChange,
  titulo,
  descripcion,
  textoConfirmar,
  destructiva = false,
  motivo,
  onConfirmar,
  procesando = false,
}: DialogoConfirmacionProps) {
  const id = useId()
  const opciones = { obligatorio: motivo?.obligatorio ?? false, minimo: motivo?.minimo, maximo: motivo?.maximo }
  const maximo = opciones.maximo ?? MOTIVO_MAXIMO_POR_DEFECTO
  const minimo = minimoEfectivo(opciones)

  // Un solo campo: React Hook Form + Zod como el resto de formularios, con el esquema compartido de `lib/motivo`
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ motivo: string }>({
    resolver: zodResolver(esquemaMotivo(opciones)),
    defaultValues: { motivo: '' },
  })
  const escrito = useWatch({ control, name: 'motivo' })
  const error = errors.motivo?.message
  const bloqueado = procesando || isSubmitting

  const idCampo = `${id}-motivo`
  const idAyuda = `${idCampo}-ayuda`
  const idError = `${idCampo}-error`
  const etiqueta = motivo?.etiqueta ?? 'Motivo'

  const enviar = handleSubmit(async (datos) => {
    await onConfirmar(motivo ? datos.motivo || undefined : undefined)
  })

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold text-heading">{titulo}</DialogTitle>
        <DialogDescription>{descripcion}</DialogDescription>
      </DialogHeader>

      {motivo && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={idCampo}>{motivo.obligatorio ? etiqueta : `${etiqueta} (opcional)`}</Label>
          <Textarea
            id={idCampo}
            rows={4}
            maxLength={maximo}
            readOnly={bloqueado}
            aria-required={motivo.obligatorio}
            aria-invalid={!!error}
            aria-describedby={error ? `${idAyuda} ${idError}` : idAyuda}
            data-autofocus
            {...register('motivo')}
          />
          <div className="flex items-start justify-between gap-3 text-xs text-muted-foreground">
            <p id={idAyuda}>{minimo ? `Mínimo ${minimo} caracteres.` : 'Queda registrado en el historial.'}</p>
            <p aria-hidden className="tabular-nums">{escrito.length}/{maximo}</p>
          </div>
          {error && (
            <p id={idError} role="alert" className="flex items-start gap-1.5 text-sm text-destructive">
              <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          )}
        </div>
      )}

      <DialogFooter className="-mx-6 -mb-6 px-6">
        <Button type="button" variant="outline" size="lg" disabled={bloqueado} data-autofocus={motivo ? undefined : ''} onClick={() => onAbiertoChange(false)} className="rounded-lg px-4">
          Cancelar
        </Button>
        <Button type="submit" size="lg" variant={destructiva ? 'destructive' : 'default'} disabled={bloqueado} aria-busy={bloqueado} className="rounded-lg px-4 font-semibold">
          {bloqueado && <LoaderCircle aria-hidden className="animate-spin" />}
          {textoConfirmar}
        </Button>
      </DialogFooter>
    </form>
  )
}
