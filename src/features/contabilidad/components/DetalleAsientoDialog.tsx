import { useMemo, type ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { cn } from '@/shared/lib'
import { Aviso, Badge, Button, Cargando, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui'
import { useAsiento } from '@/features/contabilidad/hooks/useAsientos'
import { usePlanCuentas } from '@/features/contabilidad/hooks/usePlanCuentas'
import {
  cuadreAsiento,
  esReversado,
  etiquetaCuenta,
  etiquetaEstadoAsiento,
  etiquetaOrigenAsiento,
  formatearFechaAsiento,
  mensajeErrorAsientos,
  motivoDescuadre,
  tonoEstadoAsiento,
} from '@/features/contabilidad/lib/asientos'
import { formatearSaldo } from '@/features/contabilidad/lib/cuenta-contable'

interface DetalleAsientoDialogProps {
  /** Asiento abierto; null = cerrado */
  idAsiento: number | null
  /** Nombre de la agencia por id; si falta, se muestra el id */
  agencias: ReadonlyMap<string, string>
  onCerrar: () => void
  /** Abre otro asiento (el que reversó a este) sin cerrar el diálogo */
  onAbrir: (idAsiento: number) => void
}

/** CON-05 · Cabecera y líneas del asiento, con el nombre de cada cuenta tomado del plan de cuentas */
export function DetalleAsientoDialog({ idAsiento, agencias, onCerrar, onAbrir }: DetalleAsientoDialogProps) {
  return (
    <Dialog open={idAsiento !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="max-h-[90vh] gap-5 overflow-y-auto p-6 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-heading">Detalle del asiento</DialogTitle>
          <DialogDescription>Cabecera y líneas del asiento, con débitos y créditos por cuenta.</DialogDescription>
        </DialogHeader>
        {idAsiento !== null && <Detalle key={idAsiento} idAsiento={idAsiento} agencias={agencias} onAbrir={onAbrir} />}
      </DialogContent>
    </Dialog>
  )
}

function Dato({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <dt className="text-xs font-semibold text-muted-foreground uppercase">{label}</dt>
      <dd className="text-sm text-heading">{children}</dd>
    </div>
  )
}

function Detalle({ idAsiento, agencias, onAbrir }: Pick<DetalleAsientoDialogProps, 'agencias' | 'onAbrir'> & { idAsiento: number }) {
  const asiento = useAsiento(idAsiento)
  // El nombre es un extra: si el plan aún carga o falla, las líneas se muestran solo con el código
  const plan = usePlanCuentas()
  const nombres = useMemo(
    () => new Map((plan.data ?? []).map((cuenta) => [cuenta.idCuentaContable, cuenta.nombreCuenta])),
    [plan.data],
  )

  if (asiento.isError) {
    return (
      <Aviso tono="error">
        {mensajeErrorAsientos(toApiError(asiento.error))}
        <Button variant="outline" size="sm" onClick={() => asiento.refetch()} className="w-fit">
          Reintentar
        </Button>
      </Aviso>
    )
  }
  if (asiento.isPending) return <Cargando texto="Cargando el asiento…" />

  const { data } = asiento
  const motivo = motivoDescuadre(data)
  const { debitos, creditos } = cuadreAsiento(data)
  const debitosLinea = (tipo: string) => tipo.trim().toUpperCase() === 'DEBITO'
  const creditosLinea = (tipo: string) => tipo.trim().toUpperCase() === 'CREDITO'

  return (
    <div className="flex flex-col gap-5">
      <dl className="grid gap-4 sm:grid-cols-3">
        <Dato label="Número">
          <span className="font-semibold">{data.numeroAsiento}</span>
        </Dato>
        <Dato label="Fecha">{formatearFechaAsiento(data.fechaAsiento)}</Dato>
        <Dato label="Estado">
          <Badge variant={tonoEstadoAsiento(data.estado)}>{etiquetaEstadoAsiento(data.estado)}</Badge>
        </Dato>
        <Dato label="Origen">{etiquetaOrigenAsiento(data.origen)}</Dato>
        <Dato label="Agencia">{agencias.get(data.idAgencia) ?? data.idAgencia}</Dato>
        <Dato label="Reversión">
          {data.idAsientoReversion !== null ? (
            <Button variant="link" onClick={() => onAbrir(data.idAsientoReversion as number)} className="h-auto p-0">
              Revertido: ver el asiento de reversión
            </Button>
          ) : esReversado(data) ? (
            'Reversado'
          ) : (
            'No está revertido'
          )}
        </Dato>
        <Dato label="Concepto" className="sm:col-span-3">
          {data.concepto}
        </Dato>
      </dl>

      {motivo && (
        <Aviso tono="error">
          <p className="flex items-center gap-2 font-semibold">
            <TriangleAlert aria-hidden="true" className="size-4" />
            Este asiento no cuadra
          </p>
          <p>{motivo}</p>
        </Aviso>
      )}

      {data.detalle.length === 0 ? (
        <Aviso>Este asiento no tiene líneas registradas.</Aviso>
      ) : (
        <div className="overflow-x-auto">
          <table aria-label="Líneas del asiento" className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-3 font-medium">
                  Cuenta
                </th>
                <th scope="col" className="px-3 py-3 text-right font-medium">
                  Débito
                </th>
                <th scope="col" className="px-3 py-3 text-right font-medium">
                  Crédito
                </th>
              </tr>
            </thead>
            <tbody>
              {data.detalle.map((linea) => (
                <tr key={linea.idMovimientoContable} className="border-b border-border">
                  <th scope="row" className="px-3 py-3 text-left font-normal text-heading">
                    <span className="block">{etiquetaCuenta(linea.codigoCuenta, nombres.get(linea.idCuentaContable))}</span>
                    {linea.idTransaccion !== null && (
                      <span className="text-xs text-muted-foreground">Transacción n.º {linea.idTransaccion}</span>
                    )}
                  </th>
                  <td className="px-3 py-3 text-right text-heading tabular-nums">
                    {debitosLinea(linea.tipoMovimiento) ? formatearSaldo(linea.monto) : ''}
                  </td>
                  <td className="px-3 py-3 text-right text-heading tabular-nums">
                    {creditosLinea(linea.tipoMovimiento) ? formatearSaldo(linea.monto) : ''}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold text-heading">
                <th scope="row" className="px-3 py-3 text-left">
                  Totales
                </th>
                <td className="px-3 py-3 text-right tabular-nums">{formatearSaldo(debitos)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatearSaldo(creditos)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
