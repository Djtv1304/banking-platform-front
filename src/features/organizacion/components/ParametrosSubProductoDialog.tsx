import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui'
import type { ProductoAdmin, SubProductoAdmin } from '@/features/organizacion/api/productos.contract'
import {
  SeccionCupos,
  SeccionElegibilidad,
  SeccionRestricciones,
} from '@/features/organizacion/components/SeccionesSubProducto'
import { SeccionVinculos } from '@/features/organizacion/components/SeccionVinculos'

interface ParametrosSubProductoDialogProps {
  producto: ProductoAdmin
  /** Subproducto a parametrizar; null = cerrado */
  subproducto: SubProductoAdmin | null
  /** ASESOR lo ve en solo lectura */
  soloLectura: boolean
  onCerrar: () => void
  onGuardado: (mensaje: string) => void
}

const DESCRIPCION = {
  Credito: 'Tasas, comisiones, seguros y tablas de amortización de este subproducto.',
  Cuenta: 'Cupos por canal, restricciones, tasas de ahorro, comisiones y seguros.',
  Tarjeta: 'Cupos por canal, tasas de tarjeta, comisiones y seguros.',
} as const

/**
 * Parámetros de un subproducto por secciones, según el tipo de producto. Cada sección se guarda
 * por separado. Los objetos que se vinculan se crean en Catálogos.
 */
export function ParametrosSubProductoDialog({ producto, subproducto, soloLectura, onCerrar, onGuardado }: ParametrosSubProductoDialogProps) {
  return (
    <Dialog open={subproducto !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="max-h-[90vh] gap-5 overflow-y-auto p-6 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-heading">
            Parámetros de {subproducto?.nombreSubProducto ?? 'subproducto'}
          </DialogTitle>
          <DialogDescription>{DESCRIPCION[producto.tipoProducto]}</DialogDescription>
        </DialogHeader>
        {subproducto && (
          <div key={subproducto.idSubProducto} className="flex flex-col gap-6">
            <SeccionElegibilidad subproducto={subproducto} soloLectura={soloLectura || subproducto.estadoCatalogo !== 'Borrador'} onGuardado={onGuardado} />
            {producto.tipoProducto !== 'Credito' && (
              <SeccionCupos subproducto={subproducto} soloLectura={soloLectura} onGuardado={onGuardado} />
            )}
            {producto.tipoProducto === 'Cuenta' && (
              <SeccionRestricciones subproducto={subproducto} soloLectura={soloLectura} onGuardado={onGuardado} />
            )}
            <SeccionVinculos
              producto={producto}
              destino={{ tipo: 'subproducto', id: subproducto.idSubProducto }}
              soloLectura={soloLectura}
              onGuardado={onGuardado}
            />
            <DialogFooter className="-mx-6 -mb-6 px-6">
              <Button type="button" variant="outline" size="lg" onClick={onCerrar} className="rounded-lg px-4">
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Lo que se vincula al producto aplica a todos sus subproductos */
export function VinculosProductoDialog({
  producto,
  abierto,
  soloLectura,
  onCerrar,
  onGuardado,
}: {
  producto: ProductoAdmin
  abierto: boolean
  soloLectura: boolean
  onCerrar: () => void
  onGuardado: (mensaje: string) => void
}) {
  return (
    <Dialog open={abierto} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent className="max-h-[90vh] gap-5 overflow-y-auto p-6 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-heading">Vínculos de {producto.nombreProducto}</DialogTitle>
          <DialogDescription>Aplican a todos sus subproductos; cada subproducto puede personalizarlos.</DialogDescription>
        </DialogHeader>
        {abierto && (
          <div className="flex flex-col gap-6">
            <SeccionVinculos
              producto={producto}
              destino={{ tipo: 'producto', id: producto.idProducto }}
              soloLectura={soloLectura}
              onGuardado={onGuardado}
            />
            <DialogFooter className="-mx-6 -mb-6 px-6">
              <Button type="button" variant="outline" size="lg" onClick={onCerrar} className="rounded-lg px-4">
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
