import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui'
import { Aviso, Cargando } from '@/features/cuenta/components/Aviso'
import { useHistorialCupo } from '@/features/cuenta/hooks/useCupos'
import { DOCUMENTOS_CUPO, mensajeErrorCupos } from '@/features/cuenta/lib/cupos'
import { resumenPaginacion, totalPaginas } from '@/features/cuenta/lib/filtros'
import { formatearFechaConsulta, formatearMonto } from '@/features/cuenta/lib/formato'

interface HistorialCupoDialogProps {
  idCuenta: number
  /** Canal cuyo historial se muestra; null = cerrado */
  idCanal: number | null
  nombreCanal: string
  onCerrar: () => void
}

/** CTA-09 · Cambios del cupo personalizado de un canal (SUPERVISOR, AUDITOR y ADMIN) */
export function HistorialCupoDialog({ idCuenta, idCanal, nombreCanal, onCerrar }: HistorialCupoDialogProps) {
  return (
    <Dialog open={idCanal !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="gap-5 p-6 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-heading">Historial de cupo · {nombreCanal}</DialogTitle>
          <DialogDescription>Cambios del cupo personalizado, del más reciente al más antiguo.</DialogDescription>
        </DialogHeader>
        {idCanal !== null && <Historial key={idCanal} idCuenta={idCuenta} idCanal={idCanal} />}
      </DialogContent>
    </Dialog>
  )
}

const COLUMNAS = ['Fecha', 'Cupo diario', 'Cupo mensual', 'Máx. por transacción', 'Modificado por']

function Historial({ idCuenta, idCanal }: { idCuenta: number; idCanal: number }) {
  const [page, setPage] = useState(1)
  const historial = useHistorialCupo(idCuenta, idCanal, page)

  if (historial.isError) {
    return <Aviso tono="error">{mensajeErrorCupos(toApiError(historial.error), 'historial')}</Aviso>
  }
  if (historial.isPending) return <Cargando texto="Cargando el historial…" />

  const { items, total } = historial.data
  if (total === 0) return <Aviso>Este canal todavía no tiene cambios de cupo personalizado.</Aviso>

  return (
    <div className="flex flex-col gap-4">
      <div className="max-h-[60vh] overflow-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              {COLUMNAS.map((columna) => (
                <th key={columna} scope="col" className="px-3 py-3 font-medium">
                  {columna}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((cambio) => (
              <tr key={cambio.idCupoModHis} className="border-b border-border">
                <td className="px-3 py-3 text-heading">
                  {formatearFechaConsulta(cambio.fechaModificacion) ?? cambio.fechaModificacion}
                </td>
                <Cambio anterior={cambio.cupoDiarioAnterior} nuevo={cambio.cupoDiarioNuevo} />
                <Cambio anterior={cambio.cupoMensualAnterior} nuevo={cambio.cupoMensualNuevo} />
                <Cambio anterior={cambio.montoMaxTxAnterior} nuevo={cambio.montoMaxTxNuevo} />
                <td className="px-3 py-3 text-heading">
                  ID {cambio.modificadoPor}
                  {cambio.solicitadoPorCliente && cambio.documentoVerificado && (
                    <div className="text-xs text-muted-foreground">Pedido del cliente · {DOCUMENTOS_CUPO[cambio.documentoVerificado]}</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPaginas(total) > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {resumenPaginacion(page, total)}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page <= 1 || historial.isFetching}
              onClick={() => setPage((actual) => actual - 1)}
              className="rounded-lg"
            >
              <ChevronLeft />
              Anterior
            </Button>
            <Button
              variant="outline"
              disabled={page >= totalPaginas(total) || historial.isFetching}
              onClick={() => setPage((actual) => actual + 1)}
              className="rounded-lg"
            >
              Siguiente
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/** «$300,00 → $400,00»; sin valor anterior (alta del personalizado) se muestra «—» */
function Cambio({ anterior, nuevo }: { anterior: number | null; nuevo: number | null }) {
  const texto = (monto: number | null) => (monto === null ? '—' : formatearMonto(monto))
  return (
    <td className="px-3 py-3 whitespace-nowrap tabular-nums">
      <span className="text-muted-foreground">{texto(anterior)}</span>
      <span aria-hidden="true"> → </span>
      <span className="sr-only"> a </span>
      <span className="font-medium text-heading">{texto(nuevo)}</span>
    </td>
  )
}
