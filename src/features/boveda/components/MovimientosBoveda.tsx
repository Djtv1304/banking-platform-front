import { useState } from 'react'

import { Aviso, Cargando, Paginacion } from '@/shared/ui'
import { mensajeErrorBoveda } from '@/features/boveda/api/bovedas.api'
import { FiltrosMovimientos } from '@/features/boveda/components/FiltrosMovimientos'
import { TablaMovimientos } from '@/features/boveda/components/TablaMovimientos'
import { useMovimientosBoveda } from '@/features/boveda/hooks/useBovedas'
import {
  armarParametrosMovimientos,
  FILTROS_MOVIMIENTOS_VACIOS,
  hayFiltrosMovimientos,
  ORDEN_INICIAL,
  resumenPaginacion,
  totalPaginas,
  type DireccionOrden,
  type FiltrosMovimientos as Filtros,
} from '@/features/boveda/lib/filtros'

interface MovimientosBovedaProps {
  idBoveda: number
  valores: ReadonlyMap<number, number>
}

/** BOV-03 · Filtros, tabla y paginación de los movimientos de una bóveda */
export function MovimientosBoveda({ idBoveda, valores }: MovimientosBovedaProps) {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_MOVIMIENTOS_VACIOS)
  const [orden, setOrden] = useState<DireccionOrden>(ORDEN_INICIAL)
  const [page, setPage] = useState(1)
  const movimientos = useMovimientosBoveda(idBoveda, armarParametrosMovimientos(filtros, orden, page), true)
  const aplicados = hayFiltrosMovimientos(filtros)
  const mensajeError = movimientos.isError ? mensajeErrorBoveda(movimientos.error, 'consultar los movimientos de bóveda') : null

  const consultar = (nuevos: Filtros) => {
    setFiltros(nuevos)
    setPage(1)
  }

  const ordenar = () => {
    setOrden((actual) => (actual === 'asc' ? 'desc' : 'asc'))
    setPage(1)
  }

  const resultado = (() => {
    if (movimientos.isError && !movimientos.data) return <Aviso tono="error">{mensajeError}</Aviso>
    if (movimientos.isPending) return <Cargando texto="Consultando los movimientos…" />
    if (movimientos.data.items.length === 0) {
      return (
        <Aviso>
          {aplicados
            ? 'Ningún movimiento coincide con el tipo y las fechas consultadas. Prueba con otros valores o usa «Limpiar».'
            : 'Esta bóveda todavía no tiene movimientos.'}
        </Aviso>
      )
    }

    const { items, total, pageSize } = movimientos.data
    return (
      <div className="flex flex-col gap-4">
        {mensajeError && <Aviso tono="error">{mensajeError}</Aviso>}
        <TablaMovimientos movimientos={items} valores={valores} orden={orden} ocupado={movimientos.isFetching} onOrdenar={ordenar} />
        <Paginacion
          resumen={resumenPaginacion(page, total, pageSize)}
          page={page}
          totalPaginas={totalPaginas(total, pageSize)}
          ocupado={movimientos.isFetching}
          onCambiar={setPage}
        />
      </div>
    )
  })()

  return (
    <div className="flex flex-col gap-6">
      <FiltrosMovimientos consultando={movimientos.isFetching} aplicados={aplicados} onConsultar={consultar} />
      {resultado}
    </div>
  )
}
