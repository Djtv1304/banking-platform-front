import { useState } from 'react'
import { LoaderCircle, TriangleAlert } from 'lucide-react'

import { cn } from '@/shared/lib'
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui'
import { formatRol } from '@/features/auth'
import { mensajeErrorCambio } from '@/features/usuarios/api/usuarios.api'
import type { RolUsuario, UsuarioDetalle } from '@/features/usuarios/api/usuarios.contract'
import { dialogoClassName, ErrorAccion } from '@/features/usuarios/components/detalle/Bloques'
import { useCambiarRol } from '@/features/usuarios/hooks/useUsuarios'
import { nombreCompleto, OPCIONES_ROL } from '@/features/usuarios/lib/formato'

interface CambiarRolDialogProps {
  usuario: UsuarioDetalle
  /** El usuario de la ficha es quien tiene la sesión abierta */
  esPropio: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onGuardado: (mensaje: string) => void
}

/** AUT-09 · Un usuario tiene un solo rol: elegir otro lo reemplaza */
export function CambiarRolDialog({ usuario, esPropio, open, onOpenChange, onGuardado }: CambiarRolDialogProps) {
  const cambio = useCambiarRol(usuario.idUsuario)
  const actual = usuario.rol?.trim().toUpperCase() ?? null
  const [elegido, setElegido] = useState<RolUsuario | null>(null)
  const pendiente = cambio.isPending
  const seleccion = elegido ?? (OPCIONES_ROL.find((opcion) => opcion.value === actual)?.value || null)
  const sinCambio = !seleccion || seleccion === actual
  const pierdeAdmin = esPropio && actual === 'ADMIN' && !!seleccion && seleccion !== 'ADMIN'

  const cerrar = () => {
    if (pendiente) return
    setElegido(null)
    cambio.reset()
    onOpenChange(false)
  }

  const guardar = async () => {
    if (!seleccion || sinCambio) return
    try {
      const actualizado = await cambio.mutateAsync(seleccion)
      setElegido(null)
      cambio.reset()
      onGuardado(`${nombreCompleto(actualizado)} ahora tiene el rol ${formatRol(actualizado.rol ?? seleccion)}.`)
    } catch {
      /* El error se muestra en el diálogo */
    }
  }

  return (
    <Dialog open={open} onOpenChange={(abierto) => (abierto ? onOpenChange(true) : cerrar())}>
      <DialogContent showCloseButton={!pendiente} className={dialogoClassName}>
        <DialogHeader className="gap-2">
          <DialogTitle className="text-2xl font-bold tracking-tight text-heading">Cambiar rol</DialogTitle>
          <DialogDescription className="text-base">
            {nombreCompleto(usuario)} tiene un solo rol. El que elijas reemplaza al actual y define qué módulos puede operar.
          </DialogDescription>
        </DialogHeader>

        <fieldset disabled={pendiente} className="min-w-0">
          <legend className="sr-only">Rol del usuario</legend>
          <div className="divide-y divide-border rounded-2xl border border-border">
            {OPCIONES_ROL.map(({ value, label }) => {
              const marcado = seleccion === value
              return (
                <label
                  key={value}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors first:rounded-t-2xl last:rounded-b-2xl has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-inset',
                    marcado ? 'bg-primary/10' : 'hover:bg-muted/60',
                  )}
                >
                  <input
                    type="radio"
                    name="rol"
                    value={value}
                    checked={marcado}
                    onChange={() => setElegido(value)}
                    className="size-4 accent-primary"
                  />
                  <span className={cn('flex-1 text-[15px] text-heading', marcado && 'font-semibold')}>{label}</span>
                  {value === actual && <span className="text-sm text-muted-foreground">Rol actual</span>}
                </label>
              )
            })}
          </div>
        </fieldset>

        {pierdeAdmin && (
          <p role="note" className="flex items-start gap-3 rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm text-foreground">
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-link" />
            Es tu propio usuario: al guardar dejarás de ser administrador y podrías perder el acceso a esta pantalla.
          </p>
        )}
        {cambio.isError && <ErrorAccion>{mensajeErrorCambio(cambio.error)}</ErrorAccion>}

        <DialogFooter className="-mx-6 -mb-6 rounded-b-3xl border-t border-border p-6 sm:-mx-8 sm:-mb-8 sm:px-8">
          <Button type="button" variant="outline" disabled={pendiente} onClick={cerrar} className="min-h-11 rounded-xl px-6">
            Cancelar
          </Button>
          <Button type="button" disabled={pendiente || sinCambio} onClick={() => void guardar()} className="min-h-11 rounded-xl px-6 font-semibold">
            {pendiente && <LoaderCircle className="animate-spin" />}
            {pendiente ? 'Guardando…' : sinCambio ? 'Elige otro rol' : `Asignar ${formatRol(seleccion)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
