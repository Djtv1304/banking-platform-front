import { RecuperacionUsuario } from '@/features/usuarios/components/detalle/SeguimientoCambioUsuario'
import { useState } from 'react'
import { LoaderCircle } from 'lucide-react'

import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui'
import { useAgencias } from '@/features/catalogos'
import { mensajeErrorCambio } from '@/features/usuarios/api/usuarios.api'
import type { UsuarioDetalle } from '@/features/usuarios/api/usuarios.contract'
import { Campo } from '@/features/usuarios/components/Campo'
import { dialogoClassName, ErrorAccion } from '@/features/usuarios/components/detalle/Bloques'
import { useTrasladarUsuario } from '@/features/usuarios/hooks/useUsuarios'
import { selectClassName } from '@/features/usuarios/lib/campos'
import { etiquetaAgencia, nombreCompleto } from '@/features/usuarios/lib/formato'

interface CambiarAgenciaDialogProps {
  usuario: UsuarioDetalle
  open: boolean
  onOpenChange: (open: boolean) => void
  onGuardado: (mensaje: string) => void
}

/** E1-04 · Traslado a una agencia activa. */
export function CambiarAgenciaDialog({ usuario, open, onOpenChange, onGuardado }: CambiarAgenciaDialogProps) {
  const edicion = useTrasladarUsuario(usuario.idUsuario)
  const agencias = useAgencias()
  const [elegida, setElegida] = useState<string | null>(null)
  const seleccion = elegida ?? usuario.idAgencia ?? ''
  const opciones = agencias.data.filter((agencia) => agencia.estado === 'A' || agencia.idAgencia === usuario.idAgencia)
  const pendiente = edicion.isPending
  const sinCambio = !seleccion || seleccion === usuario.idAgencia

  const cerrar = () => {
    if (pendiente) return
    setElegida(null)
    edicion.reset()
    onOpenChange(false)
  }

  const guardar = async () => {
    if (sinCambio) return
    try {
      const actualizado = await edicion.mutateAsync(seleccion)
      setElegida(null)
      edicion.reset()
      const agencia = agencias.data.find((item) => item.idAgencia === actualizado.idAgencia)
      onGuardado(`${nombreCompleto(actualizado)} ahora opera en la agencia ${agencia ? etiquetaAgencia(agencia) : actualizado.idAgencia}.`)
    } catch {
      /* El error se muestra en el diálogo */
    }
  }

  return (
    <Dialog open={open} onOpenChange={(abierto) => (abierto ? onOpenChange(true) : cerrar())}>
      <DialogContent showCloseButton={!pendiente} className={dialogoClassName}>
        <DialogHeader className="gap-2">
          <DialogTitle className="text-2xl font-bold tracking-tight text-heading">Cambiar agencia</DialogTitle>
          <DialogDescription className="text-base">
            Elige la agencia en la que {nombreCompleto(usuario)} operará desde ahora.
          </DialogDescription>
        </DialogHeader>

        <Campo
          id="cambiar-agencia"
          label="Agencia"
          error={agencias.isError ? 'No pudimos cargar las agencias. Cierra e inténtalo de nuevo.' : undefined}
          ayuda="Solo se muestran las agencias activas."
        >
          <select
            id="cambiar-agencia"
            value={seleccion}
            disabled={pendiente || agencias.isLoading}
            onChange={(event) => setElegida(event.target.value)}
            className={selectClassName}
            aria-describedby="cambiar-agencia-ayuda"
          >
            {!usuario.idAgencia && (
              <option value="" disabled>
                Elige una agencia
              </option>
            )}
            {agencias.isLoading && <option value={seleccion}>Cargando agencias…</option>}
            {opciones.map((agencia) => (
              <option key={agencia.idAgencia} value={agencia.idAgencia}>
                {etiquetaAgencia(agencia)}
                {agencia.idAgencia === usuario.idAgencia ? ' (actual)' : ''}
              </option>
            ))}
          </select>
        </Campo>

        <RecuperacionUsuario idUsuario={usuario.idUsuario} />
        {edicion.isError && !edicion.bloqueado && <ErrorAccion>{mensajeErrorCambio(edicion.error)}</ErrorAccion>}

        <DialogFooter className="-mx-6 -mb-6 rounded-b-3xl border-t border-border p-6 sm:-mx-8 sm:-mb-8 sm:px-8">
          <Button type="button" variant="outline" disabled={pendiente} onClick={cerrar} className="min-h-11 rounded-xl px-6">
            Cancelar
          </Button>
          <Button type="button" disabled={pendiente || edicion.bloqueado || sinCambio} onClick={() => void guardar()} className="min-h-11 rounded-xl px-6 font-semibold">
            {pendiente && <LoaderCircle className="animate-spin" />}
            {pendiente ? 'Guardando…' : 'Guardar agencia'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
