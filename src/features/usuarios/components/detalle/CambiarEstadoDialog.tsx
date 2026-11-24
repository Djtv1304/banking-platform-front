import { RecuperacionUsuario } from '@/features/usuarios/components/detalle/SeguimientoCambioUsuario'
import type { FormEvent } from 'react'
import type { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { cn } from '@/shared/lib'
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input } from '@/shared/ui'
import { mensajeErrorCambio } from '@/features/usuarios/api/usuarios.api'
import {
  BLOQUEO_LIMITES,
  cambioEstadoSchema,
  type CambioEstado,
  type EstadoUsuario,
  type UsuarioDetalle,
} from '@/features/usuarios/api/usuarios.contract'
import { Campo } from '@/features/usuarios/components/Campo'
import { dialogoClassName, ErrorAccion } from '@/features/usuarios/components/detalle/Bloques'
import { useEditarUsuario } from '@/features/usuarios/hooks/useUsuarios'
import { ariaCampo, campoClassName } from '@/features/usuarios/lib/campos'
import { nombreCampo, nombreCompleto, tonoEstado } from '@/features/usuarios/lib/formato'

/** Solo el cambio a «Bloqueado» lleva campos: motivo (obligatorio) y observaciones */
const bloqueoSchema = cambioEstadoSchema.options[2]

type Bloqueo = z.input<typeof bloqueoSchema>

const BLOQUEO_VACIO: Bloqueo = { estado: 'Bloqueado', motivo: '', observaciones: '' }

interface Texto {
  titulo: string
  descripcion: string
  boton: string
  enCurso: string
  hecho: (nombre: string) => string
  peligro: boolean
}

function texto(destino: EstadoUsuario, desdeBloqueado: boolean, nombre: string): Texto {
  if (destino === 'Bloqueado') {
    return {
      titulo: 'Bloquear usuario',
      descripcion: `${nombre} saldrá de inmediato de todas sus sesiones y no podrá ingresar. Úsalo ante un riesgo de seguridad: el motivo queda registrado en su ficha.`,
      boton: 'Bloquear usuario',
      enCurso: 'Bloqueando…',
      hecho: (n) => `Bloqueamos a ${n} y cerramos sus sesiones abiertas.`,
      peligro: true,
    }
  }
  if (destino === 'Inactivo') {
    return {
      titulo: 'Desactivar usuario',
      descripcion: `${nombre} saldrá de todas sus sesiones y no podrá ingresar hasta que lo actives de nuevo. Úsalo cuando deje de operar por un tiempo o de forma definitiva.`,
      boton: 'Desactivar usuario',
      enCurso: 'Desactivando…',
      hecho: (n) => `Desactivamos a ${n} y cerramos sus sesiones abiertas.`,
      peligro: true,
    }
  }
  return desdeBloqueado
    ? {
        titulo: 'Desbloquear usuario',
        descripcion: `${nombre} podrá volver a ingresar al sistema con su usuario de siempre. Confirma que el motivo del bloqueo ya se resolvió.`,
        boton: 'Desbloquear',
        enCurso: 'Desbloqueando…',
        hecho: (n) => `Desbloqueamos a ${n}. Ya puede volver a ingresar.`,
        peligro: false,
      }
    : {
        titulo: 'Activar usuario',
        descripcion: `${nombre} podrá volver a ingresar al sistema con su usuario de siempre.`,
        boton: 'Activar usuario',
        enCurso: 'Activando…',
        hecho: (n) => `Activamos a ${n}. Ya puede volver a ingresar.`,
        peligro: false,
      }
}

interface CambiarEstadoDialogProps {
  usuario: UsuarioDetalle
  /** Estado al que se quiere llevar al usuario; null = cerrado */
  destino: EstadoUsuario | null
  onCerrar: () => void
  onGuardado: (mensaje: string) => void
}

/** AUT-08 · `{ estado }` y, al bloquear, `motivo` y `observaciones`. Bloquear o desactivar corta sus sesiones */
export function CambiarEstadoDialog({ usuario, destino, onCerrar, onGuardado }: CambiarEstadoDialogProps) {
  const edicion = useEditarUsuario(usuario.idUsuario)
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Bloqueo, unknown, z.output<typeof bloqueoSchema>>({
    resolver: zodResolver(bloqueoSchema),
    defaultValues: BLOQUEO_VACIO,
    shouldFocusError: true,
  })
  const pendiente = edicion.isPending
  const nombre = nombreCompleto(usuario)
  const t = destino ? texto(destino, tonoEstado(usuario.estado) === 'bloqueado', nombre) : null
  const bloqueando = destino === 'Bloqueado'

  const cerrar = () => {
    if (pendiente) return
    reset(BLOQUEO_VACIO)
    edicion.reset()
    onCerrar()
  }

  const confirmar = async (cambio: CambioEstado) => {
    if (!t) return
    try {
      await edicion.mutateAsync(cambio)
      reset(BLOQUEO_VACIO)
      edicion.reset()
      onGuardado(t.hecho(nombre))
    } catch (error) {
      for (const { field, message } of toApiError(error).fields) {
        const campo = nombreCampo(field)
        if (campo === 'motivo' || campo === 'observaciones') setError(campo, { message }, { shouldFocus: true })
      }
    }
  }

  const enviar = (event: FormEvent) => {
    if (bloqueando) return void handleSubmit(confirmar)(event)
    event.preventDefault()
    if (destino) void confirmar({ estado: destino } as CambioEstado)
  }

  return (
    <Dialog open={destino !== null} onOpenChange={(abierto) => !abierto && cerrar()}>
      <DialogContent
        showCloseButton={!pendiente}
        onInteractOutside={(event) => {
          if (pendiente || bloqueando) event.preventDefault()
        }}
        className={dialogoClassName}
      >
        {t && (
          <form onSubmit={enviar} noValidate aria-busy={pendiente} className="flex flex-col gap-6">
            <DialogHeader className="gap-2">
              <DialogTitle className="text-2xl font-bold tracking-tight text-heading">{t.titulo}</DialogTitle>
              <DialogDescription className="text-base">{t.descripcion}</DialogDescription>
            </DialogHeader>

            {bloqueando && (
              <fieldset disabled={pendiente} className="flex min-w-0 flex-col gap-5">
                <Campo id="bloqueo-motivo" label="Motivo" error={errors.motivo?.message}>
                  <Input
                    id="bloqueo-motivo"
                    autoComplete="off"
                    maxLength={BLOQUEO_LIMITES.motivo}
                    placeholder="Ej.: accesos fuera de horario"
                    className={campoClassName}
                    {...ariaCampo('bloqueo-motivo', errors.motivo?.message)}
                    {...register('motivo')}
                  />
                </Campo>
                <Campo
                  id="bloqueo-observaciones"
                  label="Observaciones (opcional)"
                  error={errors.observaciones?.message}
                  ayuda="Detalles que ayuden a quien revise el bloqueo después."
                >
                  <textarea
                    id="bloqueo-observaciones"
                    rows={3}
                    maxLength={BLOQUEO_LIMITES.observaciones}
                    className={cn(
                      campoClassName,
                      'h-auto min-h-24 w-full resize-y border py-3 text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive',
                    )}
                    {...ariaCampo(
                      'bloqueo-observaciones',
                      errors.observaciones?.message,
                      'Detalles que ayuden a quien revise el bloqueo después.',
                    )}
                    {...register('observaciones')}
                  />
                </Campo>
              </fieldset>
            )}

            <RecuperacionUsuario idUsuario={usuario.idUsuario} />
        {edicion.isError && !edicion.bloqueado && <ErrorAccion>{mensajeErrorCambio(edicion.error)}</ErrorAccion>}

            <DialogFooter className="-mx-6 -mb-6 rounded-b-3xl border-t border-border p-6 sm:-mx-8 sm:-mb-8 sm:px-8">
              <Button type="button" variant="outline" disabled={pendiente} onClick={cerrar} className="min-h-11 rounded-xl px-6">
                Cancelar
              </Button>
              <Button
                type="submit"
                variant={t.peligro ? 'destructive' : 'default'}
                disabled={pendiente}
                className="min-h-11 rounded-xl px-6 font-semibold"
              >
                {pendiente && <LoaderCircle className="animate-spin" />}
                {pendiente ? t.enCurso : t.boton}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
