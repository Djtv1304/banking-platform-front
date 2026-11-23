import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { obtenerContextoAgencias } from '@/features/auth/api/auth.api'
import { hasAnyRole, useAuthStore, usePuedeFuncion } from '@/features/auth'
import { CONTABILIDAD_ROLES } from '@/features/contabilidad/api/contabilidad.contract'

import { toApiError } from '@/shared/api'
import { Aviso, Button, Cargando, Paginacion } from '@/shared/ui'
import { useAgencias } from '@/features/catalogos'
import type { CampoOrdenAsiento } from '@/features/contabilidad/api/asientos.contract'
import { DetalleAsientoDialog } from '@/features/contabilidad/components/DetalleAsientoDialog'
import { FiltrosAsientos } from '@/features/contabilidad/components/FiltrosAsientos'
import { TablaAsientos } from '@/features/contabilidad/components/TablaAsientos'
import { useAsientos } from '@/features/contabilidad/hooks/useAsientos'
import {
  alternarOrden,
  armarParametrosAsientos,
  etiquetaAgencia,
  FILTROS_ASIENTOS_VACIOS,
  mensajeErrorAsientos,
  ORDEN_ASIENTOS_INICIAL,
  resumenPaginacionAsientos,
  totalPaginasAsientos,
  type FiltrosAsientos as Filtros,
  type OrdenAsientos,
} from '@/features/contabilidad/lib/asientos'

/** E4-02 · Consulta de asientos contables (CON-04): CONTADOR, AUDITOR y ADMIN */
export function AsientosPage() {
  // Los filtros quedan en memoria, no en la URL
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_ASIENTOS_VACIOS)
  const [orden, setOrden] = useState<OrdenAsientos>(ORDEN_ASIENTOS_INICIAL)
  const [page, setPage] = useState(1)
  const [seleccionado, setSeleccionado] = useState<number | null>(null)
  const roles = useAuthStore(s => s.user?.roles)
  const puedeRegistrar = usePuedeFuncion('contabilidad.asientos.crear', hasAnyRole(roles ?? [], CONTABILIDAD_ROLES.asientosManuales))
  const contexto = useQuery({ queryKey: ['auth', 'agencias'], queryFn: ({ signal }) => obtenerContextoAgencias(signal), retry: false })
  const bloquearAgencia = !contexto.data?.alcanceGlobal && !contexto.data?.accesoTodasAgencias
  const agenciaFija = bloquearAgencia ? contexto.data?.idAgencia ?? '' : undefined
  const efectivos = bloquearAgencia ? { ...filtros, idAgencia: agenciaFija ?? '' } : contexto.data?.alcanceGlobal ? filtros : { ...filtros, idAgencia: filtros.idAgencia || contexto.data?.idAgencia || '' }
  const asientos = useAsientos(armarParametrosAsientos(efectivos, page, orden))

  const agencias = useAgencias()
  const nombresAgencia = useMemo(
    () => new Map(agencias.data.map((agencia) => [agencia.idAgencia, etiquetaAgencia(agencia)])),
    [agencias.data],
  )

  const consultar = (nuevos: Filtros) => {
    setFiltros(nuevos)
    setPage(1)
  }

  const ordenar = (campo: CampoOrdenAsiento) => {
    setOrden((actual) => alternarOrden(actual, campo))
    setPage(1)
  }

  const resultado = (() => {
    if (asientos.isError) {
      return (
        <Aviso tono="error">
          {mensajeErrorAsientos(toApiError(asientos.error))}
          <Button variant="outline" size="sm" onClick={() => asientos.refetch()} className="w-fit">
            Reintentar
          </Button>
        </Aviso>
      )
    }
    if (asientos.isPending) return <Cargando texto="Consultando los asientos…" />

    const { items, total, pageSize } = asientos.data
    if (items.length === 0) return <Aviso>No hay asientos con esos filtros. Prueba con otra fecha, agencia, origen o estado.</Aviso>

    return (
      <div className="flex flex-col gap-4">
        <TablaAsientos asientos={items} orden={orden} agencias={nombresAgencia} onOrdenar={ordenar} onSeleccionar={setSeleccionado} />
        <Paginacion
          resumen={resumenPaginacionAsientos(page, total, pageSize)}
          page={page}
          totalPaginas={totalPaginasAsientos(total, pageSize)}
          ocupado={asientos.isFetching}
          onCambiar={setPage}
        />
      </div>
    )
  })()

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">Asientos contables</h1>
          <p className="mt-2 text-base text-muted-foreground">
            Libro diario de la cooperativa, del más reciente al más antiguo. Filtra por fecha, agencia, origen o estado.
            {puedeRegistrar ? ' Los asientos manuales pasan por aprobación antes de contabilizarse.' : ' Tienes acceso de solo consulta.'}
          </p>
        </div>
        {puedeRegistrar && (
          <Button asChild className="shrink-0"><Link to="/contabilidad/asientos/nuevo">Nuevo asiento</Link></Button>
        )}
      </header>

      <section aria-label="Filtros" className="rounded-3xl border border-border bg-card p-6 not-dark:shadow-xl not-dark:shadow-brand-ink/5 sm:p-8">
        <FiltrosAsientos consultando={asientos.isFetching} onConsultar={consultar} bloquearAgencia={bloquearAgencia} agenciaFija={agenciaFija} permitirTodas={!!contexto.data?.alcanceGlobal} agenciaInicial={contexto.data?.idAgencia ?? undefined} />
      </section>

      <section aria-label="Resultados" className="rounded-3xl border border-border bg-card p-4 sm:p-6">
        {resultado}
      </section>

      <DetalleAsientoDialog
        idAsiento={seleccionado}
        agencias={nombresAgencia}
        onCerrar={() => setSeleccionado(null)}
        onAbrir={setSeleccionado}
      />
    </div>
  )
}
