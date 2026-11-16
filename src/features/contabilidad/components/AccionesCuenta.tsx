import { FolderPlus, Pencil, Power, Trash2, type LucideIcon } from 'lucide-react'

import { Button } from '@/shared/ui'
import type { NodoCuenta } from '@/features/contabilidad/lib/arbol'
import { bloqueosCuenta, estaActiva } from '@/features/contabilidad/lib/cuenta-contable'

export type TipoAccion = 'subcuenta' | 'nombre' | 'estado' | 'eliminar'

interface AccionesCuentaProps {
  nodo: NodoCuenta
  onAccion: (tipo: TipoAccion) => void
}

/** Acciones de CONTADOR y ADMIN. Una acción bloqueada queda deshabilitada con su motivo debajo */
export function AccionesCuenta({ nodo, onAccion }: AccionesCuentaProps) {
  const { cuenta } = nodo
  const bloqueos = bloqueosCuenta(cuenta, nodo.hijos.length > 0)
  const activa = estaActiva(cuenta)

  const acciones: { tipo: TipoAccion; label: string; Icono: LucideIcon; motivo: string | null; destructiva?: boolean }[] = [
    { tipo: 'subcuenta', label: 'Nueva subcuenta', Icono: FolderPlus, motivo: bloqueos.nuevaSubcuenta },
    { tipo: 'nombre', label: 'Editar nombre', Icono: Pencil, motivo: bloqueos.renombrar },
    { tipo: 'estado', label: activa ? 'Desactivar' : 'Activar', Icono: Power, motivo: bloqueos.cambiarEstado, destructiva: activa },
    { tipo: 'eliminar', label: 'Eliminar', Icono: Trash2, motivo: bloqueos.eliminar, destructiva: true },
  ]

  return (
    <section aria-label="Acciones de la cuenta" className="flex flex-col gap-3 border-t border-border pt-5">
      {acciones.map(({ tipo, label, Icono, motivo, destructiva }) => {
        const idMotivo = `accion-${tipo}-motivo`
        return (
          <div key={tipo} className="flex flex-col gap-1">
            <Button
              variant={destructiva ? 'destructive' : tipo === 'subcuenta' ? 'default' : 'outline'}
              disabled={motivo !== null}
              aria-describedby={motivo ? idMotivo : undefined}
              onClick={() => onAccion(tipo)}
              className="h-10 w-full justify-start rounded-lg px-3 font-semibold"
            >
              <Icono />
              {label}
            </Button>
            {motivo && (
              <p id={idMotivo} className="text-xs text-muted-foreground">
                {motivo}
              </p>
            )}
          </div>
        )
      })}
    </section>
  )
}
