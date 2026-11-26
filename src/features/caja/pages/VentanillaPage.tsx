import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'

import { cn } from '@/shared/lib'
import { Aviso, Button, Cargando } from '@/shared/ui'
import { mensajeErrorCaja } from '@/features/caja/api/caja.api'
import { AperturaJornada } from '@/features/caja/components/AperturaJornada'
import { PanelJornada } from '@/features/caja/components/PanelJornada'
import { CAJA_KEY, useCajasFisicas, useJornadaActual } from '@/features/caja/hooks/useCaja'

/** E7-02 · Inicio de ventanilla del cajero: abre su jornada o ve la que tiene abierta */
export function VentanillaPage() {
  const jornada = useJornadaActual(true)
  const cache = useQueryClient()
  const actualizando = useIsFetching({ queryKey: CAJA_KEY }) > 0
  // Con la jornada abierta, CAJ-01 solo aporta el código y el límite de la ventanilla
  const cajas = useCajasFisicas(!!jornada.data)
  const caja = jornada.data ? (cajas.data?.find((c) => c.idCajaFisica === jornada.data?.idCajaFisica) ?? null) : null

  const contenido = (() => {
    if (jornada.isPending) return <Cargando texto="Buscando tu jornada…" />
    if (jornada.isError) {
      return (
        <Aviso tono="error">
          {mensajeErrorCaja(jornada.error, 'consultar tu jornada de caja')}
          <Button variant="outline" size="sm" disabled={jornada.isFetching} onClick={() => void jornada.refetch()} className="w-fit">
            <RefreshCw className={cn(jornada.isFetching && 'animate-spin')} />
            Reintentar
          </Button>
        </Aviso>
      )
    }
    if (jornada.data === null) return <AperturaJornada />
    return <PanelJornada jornada={jornada.data} caja={caja} />
  })()

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] leading-tight font-bold tracking-tight text-heading sm:text-[40px]">Mi ventanilla</h1>
          <p className="mt-2 max-w-2xl text-base text-muted-foreground">
            Tu jornada de caja: en qué ventanilla atiendes, el efectivo que recibiste y tus últimas operaciones.
          </p>
        </div>
        {jornada.data && (
          <Button variant="outline" size="sm" disabled={actualizando} onClick={() => void cache.invalidateQueries({ queryKey: CAJA_KEY })}>
            <RefreshCw className={cn(actualizando && 'animate-spin')} />
            Actualizar
          </Button>
        )}
      </header>
      {contenido}
    </div>
  )
}
