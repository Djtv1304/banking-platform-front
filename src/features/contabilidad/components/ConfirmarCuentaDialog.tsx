import { LoaderCircle } from 'lucide-react'

import { toApiError } from '@/shared/api'
import {
  Aviso,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui'
import { useCambiarEstadoCuenta, useEliminarCuenta } from '@/features/contabilidad/hooks/useMantenimientoCuentas'
import type { NodoCuenta } from '@/features/contabilidad/lib/arbol'
import { estaActiva } from '@/features/contabilidad/lib/cuenta-contable'
import { mensajeErrorPlanCuentas, mensajeResultado } from '@/features/contabilidad/lib/mensajes'

export interface Confirmacion {
  tipo: 'estado' | 'eliminar'
  nodo: NodoCuenta
}

interface ConfirmarCuentaDialogProps {
  /** null = cerrado */
  confirmacion: Confirmacion | null
  onCerrar: () => void
  /** `eliminada` = la cuenta ya no está en el plan (para quitar la selección) */
  onHecho: (mensaje: string, eliminada: boolean) => void
}

function textos({ tipo, nodo }: Confirmacion) {
  const codigo = nodo.cuenta.codigoCuenta
  if (tipo === 'eliminar') {
    return {
      titulo: `Eliminar la cuenta ${codigo}`,
      descripcion:
        'Se borra del plan de cuentas. Solo procede si no tiene saldo, subcuentas ni movimientos, y si ninguna configuración contable la usa. Si ya tuvo movimientos, desactívala.',
      boton: 'Eliminar',
      hecho: `Eliminamos la cuenta ${codigo}.`,
    }
  }
  if (estaActiva(nodo.cuenta)) {
    return {
      titulo: `Desactivar la cuenta ${codigo}`,
      descripcion:
        'Deja de recibir movimientos, pero se conserva con su historial. Solo procede si su saldo es cero.',
      boton: 'Desactivar',
      hecho: `Desactivamos la cuenta ${codigo}.`,
    }
  }
  return {
    titulo: `Activar la cuenta ${codigo}`,
    descripcion: 'Vuelve a estar disponible para recibir movimientos.',
    boton: 'Activar',
    hecho: `Activamos la cuenta ${codigo}.`,
  }
}

/** Desactivar/activar (PATCH …/estado) o eliminar (DELETE), propuestos */
export function ConfirmarCuentaDialog({ confirmacion, onCerrar, onHecho }: ConfirmarCuentaDialogProps) {
  const cambiarEstado = useCambiarEstadoCuenta()
  const eliminar = useEliminarCuenta()
  const mutacion = confirmacion?.tipo === 'eliminar' ? eliminar : cambiarEstado
  const t = confirmacion && textos(confirmacion)

  const cerrar = () => {
    cambiarEstado.reset()
    eliminar.reset()
    onCerrar()
  }

  const confirmar = () => {
    if (!confirmacion || !t) return
    const { cuenta } = confirmacion.nodo
    const opciones = {
      onSuccess: ({ pendiente }: { pendiente: boolean }) => {
        cambiarEstado.reset()
        eliminar.reset()
        onHecho(mensajeResultado(pendiente, t.hecho), confirmacion.tipo === 'eliminar' && !pendiente)
      },
    }
    if (confirmacion.tipo === 'eliminar') eliminar.mutate(cuenta.idCuentaContable, opciones)
    else cambiarEstado.mutate({ id: cuenta.idCuentaContable, estado: estaActiva(cuenta) ? 'Inactivo' : 'Activo' }, opciones)
  }

  const destructiva = confirmacion?.tipo === 'eliminar' || (confirmacion !== null && estaActiva(confirmacion.nodo.cuenta))

  return (
    <Dialog open={confirmacion !== null} onOpenChange={(abierto) => !abierto && cerrar()}>
      <DialogContent className="gap-5 p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-heading">{t?.titulo}</DialogTitle>
          <DialogDescription>{t?.descripcion}</DialogDescription>
        </DialogHeader>
        {confirmacion && <p className="text-sm text-heading">{confirmacion.nodo.cuenta.nombreCuenta}</p>}

        {mutacion.isError && <Aviso tono="error">{mensajeErrorPlanCuentas(toApiError(mutacion.error), 'mantenimiento')}</Aviso>}

        <DialogFooter className="-mx-6 -mb-6 px-6">
          <Button type="button" variant="outline" size="lg" onClick={cerrar} className="rounded-lg px-4">
            Cancelar
          </Button>
          <Button
            type="button"
            size="lg"
            variant={destructiva ? 'destructive' : 'default'}
            disabled={mutacion.isPending}
            onClick={confirmar}
            className="rounded-lg px-4 font-semibold"
          >
            {mutacion.isPending && <LoaderCircle className="animate-spin" />}
            {t?.boton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
