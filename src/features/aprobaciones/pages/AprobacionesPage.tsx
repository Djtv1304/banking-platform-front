import { etiquetaContable } from '@/features/contabilidad/lib/etiquetas'
import { responsable } from '@/features/aprobaciones/lib/presentacion'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import type { BandejaNombre } from '@/features/aprobaciones/api/aprobaciones.contract'
import { useAccesosAprobaciones, useBandejaAprobaciones } from '@/features/aprobaciones/hooks/useAprobaciones'
import { Aviso, Badge, Button, Cargando, Paginacion } from '@/shared/ui'
import { ErrorApi } from '@/shared/ui/error-api'
import { ExportarCsvButton } from '@/features/organizacion/components/ExportarCsvButton'
import { useAuthStore } from '@/features/auth'

const nombres: Record<BandejaNombre, string> = { pendientes: 'Pendientes para mi', mias: 'Mis solicitudes', resueltas: 'Resueltas' }


export function AprobacionesPage() {
  const soloAuditoria = useAuthStore((state) => {
    const user = state.user
    return !!user && (user.roles.length === 1 && user.roles[0] === 'AUDITOR' || user.roles.length === 0 && user.permisos.includes('org-exportar'))
  })
  const [parametros] = useSearchParams()
  const [bandeja, setBandeja] = useState<BandejaNombre>(
    soloAuditoria ? 'resueltas' : parametros.get('bandeja') === 'mias' ? 'mias' : 'pendientes',
  )
  const [page, setPage] = useState(1)
  const [ahora, setAhora] = useState(Date.now)
  const accesos = useAccesosAprobaciones()
  const listado = useBandejaAprobaciones(bandeja, page)
  if (accesos.isPending) return <Cargando texto="Comprobando acceso a aprobaciones..." />
  if (accesos.isError) return <ErrorApi error={accesos.error} reintentar={() => void accesos.refetch()} />
  if (!accesos.data.puedeVer) return <Aviso>No tienes acceso a esta bandeja.</Aviso>
  return <section className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold text-heading">Aprobaciones</h1><p className="mt-1 text-sm text-muted-foreground">Revisa las solicitudes y sus cambios antes de aprobarlas o rechazarlas.</p></div><Button variant="outline" disabled={listado.isFetching} onClick={() => { setAhora(Date.now()); void listado.refetch(); void accesos.refetch() }}>Actualizar</Button></header>
    <nav aria-label="Bandejas de aprobaciones" className="flex flex-wrap gap-2">{(soloAuditoria ? ['resueltas'] as const : Object.keys(nombres) as BandejaNombre[]).map((nombre) => <Button key={nombre} variant={nombre === bandeja ? 'default' : 'outline'} aria-pressed={nombre === bandeja} onClick={() => { setBandeja(nombre); setPage(1) }}>{nombres[nombre]}{nombre === 'pendientes' && <Badge variant="secondary">{accesos.data.pendientesParaMi}</Badge>}</Button>)}</nav>
    <ExportarCsvButton ruta="/api/v1/aprobaciones" parametros={{ bandeja, page: String(page) }} archivo="aprobaciones.csv" etiqueta="Exportar página CSV" />
    {listado.isPending ? <Cargando texto="Cargando solicitudes..." /> : listado.isError ? <ErrorApi error={listado.error} reintentar={() => void listado.refetch()} /> : listado.data.items.length === 0 ? <Aviso>No hay solicitudes en esta bandeja.</Aviso> : <>
      <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full text-left text-sm"><caption className="sr-only">{nombres[bandeja]}</caption><thead className="bg-muted/50"><tr>{['Solicitud', 'Objetivo', 'Agencia', 'Responsable', 'Estado', 'Creada'].map((t) => <th scope="col" className="p-3" key={t}>{t}</th>)}</tr></thead><tbody>{listado.data.items.map((s) => <tr key={s.idSolicitud} className="border-t border-border"><td className="p-3">{soloAuditoria ? <span>#{s.idSolicitud}</span> : <Link className="rounded font-medium text-link underline focus-visible:outline-2" to={`/aprobaciones/${s.idSolicitud}`}>#{s.idSolicitud}</Link>}{s.estado === 'Pendiente' && ahora - Date.parse(s.fechaSolicitud) >= listado.data.diasResaltar * 86400000 && <Badge className="ml-2" variant="outline">Antigua</Badge>}</td><td className="p-3">{s.tipoObjetivo === 'PlantillaAsiento' ? etiquetaContable(s.tipoObjetivo) : s.tipoObjetivo}: {s.idObjetivo}</td><td className="p-3">{s.idAgencia ?? 'Institucional'}</td><td className="p-3">{responsable(s.solicitante)}</td><td className="p-3"><Badge variant="outline">{s.estado}</Badge></td><td className="p-3"><time dateTime={s.fechaSolicitud}>{new Date(s.fechaSolicitud).toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })}</time></td></tr>)}</tbody></table></div>
    </>}
    {listado.data && !listado.isError && <Paginacion resumen={`${listado.data.total} solicitudes`} page={page} totalPaginas={Math.max(1, Math.ceil(listado.data.total / listado.data.pageSize))} ocupado={listado.isFetching} onCambiar={setPage} />}
  </section>
}
