import { useState } from 'react'
import { LoaderCircle } from 'lucide-react'

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
  open: boolean
  onOpenChange: (open: boolean) => void
  onGuardado: (mensaje: string) => void
}

export function CambiarRolDialog({ usuario, open, onOpenChange, onGuardado }: CambiarRolDialogProps) {
  const cambio = useCambiarRol(usuario.idUsuario)
  const actuales = usuario.roles ?? OPCIONES_ROL.filter(({ value }) => value === usuario.rol).map(({ value }) => value)
  const [elegidos, setElegidos] = useState<RolUsuario[] | null>(null)
  const pendiente = cambio.isPending
  const seleccion = elegidos ?? actuales
  const sinCambio = seleccion.length === actuales.length && seleccion.every((rol) => actuales.includes(rol))

  const cerrar = () => {
    if (pendiente) return
    setElegidos(null)
    cambio.reset()
    onOpenChange(false)
  }

  const guardar = async () => {
    if (seleccion.length === 0 || sinCambio) return
    try {
      const actualizado = await cambio.mutateAsync(seleccion)
      setElegidos(null)
      cambio.reset()
      onGuardado(`${nombreCompleto(actualizado)} ahora tiene estos roles: ${(actualizado.roles ?? seleccion).map(formatRol).join(', ')}.`)
    } catch {
      /* El error se muestra en el diálogo */
    }
  }

  return (
    <Dialog open={open} onOpenChange={(abierto) => (abierto ? onOpenChange(true) : cerrar())}>
      <DialogContent showCloseButton={!pendiente} className={dialogoClassName}>
        <DialogHeader className="gap-2">
          <DialogTitle className="text-2xl font-bold tracking-tight text-heading">Cambiar roles</DialogTitle>
          <DialogDescription className="text-base">
            Elige los roles que corresponden a las funciones de {nombreCompleto(usuario)}.
          </DialogDescription>
        </DialogHeader>

        <fieldset disabled={pendiente} className="min-w-0">
          <legend className="sr-only">Roles del usuario</legend>
          <div className="divide-y divide-border rounded-2xl border border-border">
            {OPCIONES_ROL.map(({ value, label }) => {
              const marcado = seleccion.includes(value)
              return (
                <label
                  key={value}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors first:rounded-t-2xl last:rounded-b-2xl has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-inset',
                    marcado ? 'bg-primary/10' : 'hover:bg-muted/60',
                  )}
                >
                  <input
                    type="checkbox"
                    name="rol"
                    value={value}
                    checked={marcado}
                    onChange={() => setElegidos(marcado ? seleccion.filter((rol) => rol !== value) : [...seleccion, value])}
                    className="size-4 accent-primary"
                  />
                  <span className={cn('flex-1 text-[15px] text-heading', marcado && 'font-semibold')}>{label}</span>
                  {actuales.includes(value) && <span className="text-sm text-muted-foreground">Rol actual</span>}
                </label>
              )
            })}
          </div>
        </fieldset>

        {cambio.isError && <ErrorAccion>{mensajeErrorCambio(cambio.error)}</ErrorAccion>}

        <DialogFooter className="-mx-6 -mb-6 rounded-b-3xl border-t border-border p-6 sm:-mx-8 sm:-mb-8 sm:px-8">
          <Button type="button" variant="outline" disabled={pendiente} onClick={cerrar} className="min-h-11 rounded-xl px-6">
            Cancelar
          </Button>
          <Button type="button" disabled={pendiente || sinCambio || seleccion.length === 0} onClick={() => void guardar()} className="min-h-11 rounded-xl px-6 font-semibold">
            {pendiente && <LoaderCircle className="animate-spin" />}
            {pendiente ? 'Guardando…' : 'Guardar roles'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
