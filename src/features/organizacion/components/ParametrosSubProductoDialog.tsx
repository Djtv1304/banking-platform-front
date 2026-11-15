import { Button, Cargando, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui'
import { useTasasInteres, type TasaInteres } from '@/features/catalogos'
import type { ProductoAdmin, SubProductoAdmin } from '@/features/organizacion/api/productos.contract'
import { SeccionCupos, SeccionRestricciones } from '@/features/organizacion/components/SeccionesSubProducto'
import { dinero, porcentaje } from '@/features/organizacion/lib/producto-form'

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
  Credito: 'Tasas de interés del tipo de crédito del producto, con sus rangos de monto y plazo.',
  Cuenta: 'Cupos por canal y restricciones de la cuenta.',
  Tarjeta: 'Cupos por canal de la tarjeta.',
} as const

/**
 * Parámetros de un subproducto por secciones, según el tipo de producto. Cada sección se guarda
 * por separado. Los objetos que se vinculan (tasas, canales) se crean en Catálogos.
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
            {producto.tipoProducto === 'Credito' ? (
              <TasasDelTipoDeCredito producto={producto} />
            ) : (
              <SeccionCupos subproducto={subproducto} soloLectura={soloLectura} onGuardado={onGuardado} />
            )}
            {producto.tipoProducto === 'Cuenta' && (
              <SeccionRestricciones subproducto={subproducto} soloLectura={soloLectura} onGuardado={onGuardado} />
            )}
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

function rangoTasa(t: TasaInteres) {
  const vigencia = t.vigenciaHasta ? `${t.vigenciaDesde} a ${t.vigenciaHasta}` : `desde ${t.vigenciaDesde}`
  return `${dinero(t.montoMinimo)} a ${dinero(t.montoMaximo)} · hasta ${t.plazoMaximoMeses} meses · ${vigencia}`
}

/**
 * Créditos: hoy la BD vincula las tasas al tipo de crédito (Credito.TasaInteres.IdTipoCredito), y
 * ahí están los rangos de monto y plazo. Se muestran en solo lectura; se editan en Catálogos.
 */
function TasasDelTipoDeCredito({ producto }: { producto: ProductoAdmin }) {
  const tasas = useTasasInteres(producto.idTipoCredito ?? undefined)
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border p-4">
      <div>
        <h3 className="text-base font-semibold text-heading">Tasas de {producto.nombreTipoCredito ?? 'este tipo de crédito'}</h3>
        <p className="text-sm text-muted-foreground">Se crean y editan en Productos y Catálogos › Catálogos › Tasas de interés.</p>
      </div>
      {tasas.isPending ? (
        <Cargando texto="Cargando tasas…" />
      ) : tasas.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay tasas activas para este tipo de crédito.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tasas.data.map((t) => (
            <li key={t.idTasaInteres} className="rounded-xl border border-border p-3 text-sm">
              <span className="font-semibold text-heading">
                {porcentaje(t.tasaNominalAnual)} anual
                {!t.vigente && <span className="ml-2 text-xs font-normal text-muted-foreground">(no vigente hoy)</span>}
              </span>
              <p className="text-xs text-muted-foreground">{rangoTasa(t)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
