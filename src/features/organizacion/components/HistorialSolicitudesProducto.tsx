import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { obtenerSolicitud } from '@/features/aprobaciones/api/aprobaciones.api'
import type { VigenciasProducto } from '@/features/organizacion/api/programacion.contract'
import { obtenerCupos } from '@/features/organizacion/api/productos.api'
import { compararProducto, filtrarSolicitudes } from '@/features/organizacion/lib/cambios-producto'
import { FichaCambioProducto } from '@/features/organizacion/components/FichaCambioProducto'
import { mostrarValor } from '@/shared/ui/comparador-cambios'
import { toApiError } from '@/shared/api'
import { Aviso, Button, Input, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui'

type Solicitud = VigenciasProducto['solicitudes'][number]
function CambioAplicado({ solicitud: s }: { solicitud: Solicitud }) {
  const [abierto, setAbierto] = useState(false)
  const q = useQuery({ queryKey: ['aprobaciones', 'detalle', s.idSolicitud], queryFn: () => obtenerSolicitud(s.idSolicitud), staleTime: 30_000, retry: false })
  const id = Number(q.data?.idObjetivo)
  const canales = useQuery({ queryKey: ['productos', 'cupos', id], queryFn: () => obtenerCupos(id), enabled: s.clase === 'cupos' && Number.isSafeInteger(id) && id > 0, retry: false })
  const cambio = q.data ? compararProducto(q.data, canales.data ?? []) : null
  const fecha = q.data?.eventos.findLast(e => e.estadoNuevo === 'Ejecutada')?.fechaEvento ?? q.data?.fechaResolucion
  const cuando = fecha ?? s.fecha
  const clase = { condiciones: 'las condiciones', cupos: 'los limites por canal', restricciones: 'las restricciones' }[s.clase]
  return <li className="min-w-0 rounded-2xl border border-border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words font-semibold">{cambio?.titulo ?? `Cambio aplicado en ${clase}`}</h3><p className="mt-1 text-xs text-muted-foreground">{fecha ? 'Aplicado el ' : 'Solicitud registrada el '}<time dateTime={cuando}>{new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guayaquil' }).format(new Date(cuando))}</time></p></div><Button variant="outline" disabled={!q.data} onClick={() => setAbierto(true)}>Ver detalle</Button></div>
    {q.isPending && <p className="mt-3 text-sm text-muted-foreground">Cargando los cambios registrados...</p>}{q.isError && <Aviso tono="error">{toApiError(q.error).message}</Aviso>}
    {cambio && cambio.cambios.length > 0 && <ul className="mt-3 space-y-2 text-sm">{cambio.cambios.map((c, i) => <li key={`${c.grupo}-${c.campo}-${i}`} className="break-words"><span className="text-muted-foreground">{s.clase === 'cupos' ? `${c.grupo} - ` : ''}{c.etiqueta}: </span><span className="font-medium">{mostrarValor(c.valor)}</span></li>)}</ul>}
    <Dialog open={abierto} onOpenChange={setAbierto}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-5xl"><DialogHeader><DialogTitle>{cambio?.titulo ?? 'Detalle del cambio'}</DialogTitle><DialogDescription>Configuracion completa registrada en el cambio.</DialogDescription></DialogHeader>{q.data && <FichaCambioProducto solicitud={q.data} canales={canales.data ?? []} />}</DialogContent></Dialog>
  </li>
}
export function HistorialSolicitudesProducto({ solicitudes }: { solicitudes: VigenciasProducto['solicitudes'] }) {
  const [limite, setLimite] = useState(5)
  const [filtros, setFiltros] = useState({ desde: '', hasta: '', usuario: '' })
  const cambiar = (campo: keyof typeof filtros, valor: string) => { setFiltros(v => ({ ...v, [campo]: valor })); setLimite(5) }
  const filtradas = filtrarSolicitudes(solicitudes, filtros)
  const aplicadas = filtradas.filter(s => s.estado === 'Ejecutada').sort((a, b) => b.fecha.localeCompare(a.fecha) || b.idSolicitud - a.idSolicitud)
  const otras = filtradas.filter(s => s.estado !== 'Ejecutada')
  return <div className="min-w-0 space-y-4"><div role="search" aria-label="Filtrar historial de cambios" className="grid gap-3 rounded-xl bg-muted/40 p-4 sm:grid-cols-2 xl:grid-cols-4">
      <label className="min-w-0 space-y-1 text-sm">Fecha de solicitud desde<Input type="date" value={filtros.desde} max={filtros.hasta || undefined} onChange={e => cambiar('desde', e.target.value)} /></label>
      <label className="min-w-0 space-y-1 text-sm">Fecha de solicitud hasta<Input type="date" value={filtros.hasta} min={filtros.desde || undefined} onChange={e => cambiar('hasta', e.target.value)} /></label>
      <label className="min-w-0 space-y-1 text-sm">Usuario solicitante (nombre o ID)<Input type="search" placeholder="Nombre o ID interno" value={filtros.usuario} onChange={e => cambiar('usuario', e.target.value)} /></label>
      <Button variant="outline" className="self-end" disabled={!filtros.desde && !filtros.hasta && !filtros.usuario} onClick={() => { setFiltros({ desde: '', hasta: '', usuario: '' }); setLimite(5) }}>Limpiar filtros</Button>
    </div>{filtros.desde && filtros.hasta && filtros.desde > filtros.hasta && <Aviso tono="error">La fecha inicial no puede ser posterior a la final.</Aviso>}{aplicadas.length ? <><ol className="space-y-4" aria-label="Cambios aplicados">{aplicadas.slice(0, limite).map(s => <CambioAplicado key={s.idSolicitud} solicitud={s} />)}</ol>{limite < aplicadas.length && <Button variant="outline" onClick={() => setLimite(v => v + 5)}>Ver mas cambios</Button>}</> : <p className="text-muted-foreground">{filtros.desde || filtros.hasta || filtros.usuario ? 'No hay cambios aplicados que coincidan con los filtros.' : 'No hay cambios aplicados registrados en el historial de aprobaciones.'}</p>}{otras.length > 0 && <details className="rounded-xl border border-border p-4"><summary className="cursor-pointer text-sm font-medium">Solicitudes sin cambios aplicados ({otras.length})</summary><ul className="mt-3 space-y-2 text-sm">{otras.map(s => <li key={s.idSolicitud}><Link className="text-primary underline" to={`/aprobaciones/${s.idSolicitud}`}>Solicitud #{s.idSolicitud}</Link> - {s.estado}</li>)}</ul></details>}</div>
}
