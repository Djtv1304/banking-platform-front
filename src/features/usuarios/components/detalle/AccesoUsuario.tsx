import { useState } from 'react'
import { Ban, LockKeyhole, LockKeyholeOpen, Power, PowerOff } from 'lucide-react'

import { cn } from '@/shared/lib'
import { Button } from '@/shared/ui'
import type { EstadoUsuario, UsuarioDetalle } from '@/features/usuarios/api/usuarios.contract'
import { Dato } from '@/features/usuarios/components/detalle/Bloques'
import { CambiarEstadoDialog } from '@/features/usuarios/components/detalle/CambiarEstadoDialog'
import {
  etiquetaInvitacion,
  formatearFecha,
  formatearFechaHora,
  haceCuanto,
  invitacionCaducada,
  tonoEstado,
  type TonoEstado,
} from '@/features/usuarios/lib/formato'

const PUNTO: Record<TonoEstado, string> = {
  activo: 'bg-brand-amber',
  inactivo: 'bg-muted-foreground/50',
  bloqueado: 'bg-destructive',
  otro: 'bg-muted-foreground/50',
}

function resumenEstado(tono: TonoEstado, vinculado: boolean) {
  if (tono === 'bloqueado') return 'No puede ingresar hasta que lo desbloquees.'
  if (tono === 'inactivo') return 'No puede ingresar hasta que lo actives.'
  if (tono === 'activo') return vinculado ? 'Puede ingresar a EnquoCoop.' : 'Podrá ingresar en cuanto complete su primer ingreso.'
  return 'Revisa este estado con el equipo de backend.'
}

/** Cómo va el primer ingreso cuando el usuario aún no está vinculado */
function notaPrimerIngreso(estadoInvitacion: string | null | undefined) {
  if (invitacionCaducada(estadoInvitacion)) return 'La invitación ya no es válida: hay que enviarle una nueva.'
  if (estadoInvitacion?.toLowerCase() === 'accepted') return 'Ya aceptó la invitación; falta que ingrese por primera vez.'
  return 'Aún no acepta la invitación que enviamos a su correo.'
}

interface AccesoUsuarioProps {
  usuario: UsuarioDetalle
  esPropio: boolean
  onGuardado: (mensaje: string) => void
}

/** Estado, primer ingreso, último acceso y los cambios de estado de AUT-08 */
export function AccesoUsuario({ usuario, esPropio, onGuardado }: AccesoUsuarioProps) {
  const [destino, setDestino] = useState<EstadoUsuario | null>(null)
  const tono = tonoEstado(usuario.estado)
  const bloqueo = tono === 'bloqueado' ? usuario.bloqueo : null
  const ultimo = usuario.ultimoAcceso ? haceCuanto(usuario.ultimoAcceso) : null

  // Activo → desactivar o bloquear · Inactivo → activar o bloquear · Bloqueado → desbloquear o desactivar
  const acciones: { destino: EstadoUsuario; label: string; Icon: typeof Power; peligro: boolean }[] = [
    ...(tono !== 'activo'
      ? [{ destino: 'Activo' as const, label: tono === 'bloqueado' ? 'Desbloquear' : 'Activar', Icon: tono === 'bloqueado' ? LockKeyholeOpen : Power, peligro: false }]
      : []),
    ...(tono !== 'inactivo' ? [{ destino: 'Inactivo' as const, label: 'Desactivar', Icon: PowerOff, peligro: true }] : []),
    ...(tono !== 'bloqueado' ? [{ destino: 'Bloqueado' as const, label: 'Bloquear', Icon: LockKeyhole, peligro: true }] : []),
  ]

  return (
    <section aria-labelledby="acceso-usuario" className="flex flex-col overflow-hidden rounded-3xl border border-border bg-card">
      <div className="flex flex-col gap-6 p-6 sm:p-8">
        <h2 id="acceso-usuario" className="text-lg font-semibold text-heading">
          Acceso
        </h2>
        <div className="flex flex-col gap-1.5">
          <p className="flex items-center gap-2.5 text-xl font-semibold text-heading">
            <span aria-hidden className={cn('size-2.5 rounded-full', PUNTO[tono])} />
            {usuario.estado}
          </p>
          <p className="text-sm text-muted-foreground">{resumenEstado(tono, usuario.vinculado)}</p>
        </div>

        {bloqueo && (
          <div className="flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <Ban aria-hidden className="size-4" />
              {bloqueo.fechaBloqueo ? `Bloqueado el ${formatearFechaHora(bloqueo.fechaBloqueo)}` : 'Bloqueado'}
            </p>
            <dl className="flex flex-col gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Motivo</dt>
                <dd className="font-medium break-words text-heading">{bloqueo.motivo || 'Sin motivo registrado'}</dd>
              </div>
              {bloqueo.observaciones && (
                <div>
                  <dt className="text-muted-foreground">Observaciones</dt>
                  <dd className="break-words whitespace-pre-line text-heading">{bloqueo.observaciones}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        <dl className="flex flex-col gap-5 border-t border-border pt-6">
          <Dato label="Primer ingreso" nota={usuario.vinculado ? undefined : notaPrimerIngreso(usuario.estadoInvitacion)}>
            {usuario.vinculado ? 'Completado' : 'Pendiente'}
          </Dato>
          {!usuario.vinculado && usuario.estadoInvitacion && (
            <Dato label="Invitación">{etiquetaInvitacion(usuario.estadoInvitacion)}</Dato>
          )}
          <Dato label="Último ingreso" nota={ultimo ?? undefined}>
            {usuario.ultimoAcceso ? formatearFechaHora(usuario.ultimoAcceso) : 'Todavía no ha ingresado'}
          </Dato>
          <Dato label="Usuario creado">{formatearFecha(usuario.fechaCreacion)}</Dato>
        </dl>
      </div>

      <footer className="flex flex-col gap-3 border-t border-border px-6 py-5 sm:px-8">
        <div className="flex flex-wrap gap-2">
          {acciones.map(({ destino: valor, label, Icon, peligro }) => {
            const bloqueadaPorSerPropio = esPropio && valor !== 'Activo'
            return (
              <Button
                key={valor}
                variant={peligro ? 'outline' : 'default'}
                size="lg"
                disabled={bloqueadaPorSerPropio}
                onClick={() => setDestino(valor)}
                className={cn('flex-1 rounded-lg px-3', peligro && 'text-destructive hover:bg-destructive/10 hover:text-destructive')}
              >
                <Icon />
                {label}
              </Button>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {esPropio
            ? 'Es tu propio usuario: no puedes desactivarlo ni bloquearlo desde tu sesión.'
            : 'Desactivar o bloquear cierra de inmediato sus sesiones abiertas.'}
        </p>
      </footer>

      <CambiarEstadoDialog
        usuario={usuario}
        destino={destino}
        onCerrar={() => setDestino(null)}
        onGuardado={(mensaje) => {
          setDestino(null)
          onGuardado(mensaje)
        }}
      />
    </section>
  )
}
