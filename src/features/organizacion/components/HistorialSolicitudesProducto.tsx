import { Fragment, useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { obtenerSolicitud } from '@/features/aprobaciones/api/aprobaciones.api'
import type { VigenciasProducto } from '@/features/organizacion/api/programacion.contract'
import { ResumenCambioProducto } from '@/features/organizacion/components/ResumenCambioProducto'
import { toApiError } from '@/shared/api'
import { Aviso, Button, Cargando } from '@/shared/ui'

function Cambios({ id }: { id: number }) {
  const q = useQuery({ queryKey: ['aprobaciones', 'detalle', id], queryFn: () => obtenerSolicitud(id), retry: false })
  if (q.isPending) return <Cargando texto="Cargando valores anteriores y nuevos..." />
  if (q.isError) return <Aviso tono="error">{toApiError(q.error).message}</Aviso>
  return <ResumenCambioProducto solicitud={q.data} />
}

export function HistorialSolicitudesProducto({ solicitudes }: { solicitudes: VigenciasProducto['solicitudes'] }) {
  const [abierta, setAbierta] = useState<number | null>(null)
  const nombres = { condiciones: 'Condiciones', cupos: 'Cupos por canal', restricciones: 'Restricciones' }
  const acciones = { programar: 'Programacion', cancelar: 'Cancelacion', fin: 'Finalizacion' }
  if (!solicitudes.length) return <p className="text-muted-foreground">No hay solicitudes registradas.</p>
  return <div className="min-w-0 max-w-full overflow-x-auto rounded-xl border border-border" role="region" aria-label="Solicitudes y valores modificados" tabIndex={0}>
    <table className="w-full text-left text-sm"><caption className="sr-only">Fecha, responsable, estado y comparacion de cada solicitud</caption>
      <thead className="bg-muted/50"><tr>{['Fecha de solicitud', 'Responsable', 'Cambio', 'Estado de aprobacion', 'Valor anterior / valor nuevo', 'Solicitud'].map(c => <th key={c} scope="col" className="whitespace-nowrap px-4 py-3 font-semibold">{c}</th>)}</tr></thead>
      <tbody>{[...solicitudes].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.idSolicitud - a.idSolicitud).map(s => <Fragment key={s.idSolicitud}>
        <tr className="border-t border-border align-top"><td className="whitespace-nowrap px-4 py-3"><time dateTime={s.fecha}>{new Intl.DateTimeFormat('es-EC', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Guayaquil' }).format(new Date(s.fecha))}</time></td><td className="px-4 py-3">{s.responsable}</td><td className="px-4 py-3">{nombres[s.clase]}<span className="block text-xs text-muted-foreground">{acciones[s.accion]}</span></td><td className="px-4 py-3">{s.estado}</td><td className="px-4 py-3"><Button variant="outline" aria-expanded={abierta === s.idSolicitud} aria-controls={`cambio-${s.idSolicitud}`} onClick={() => setAbierta(abierta === s.idSolicitud ? null : s.idSolicitud)}>Ver cambios</Button></td><td className="px-4 py-3"><Link className="text-primary underline" to={`/aprobaciones/${s.idSolicitud}`}>#{s.idSolicitud}</Link></td></tr>
        {abierta === s.idSolicitud && <tr id={`cambio-${s.idSolicitud}`}><td colSpan={6} className="border-t border-border p-4"><Cambios id={s.idSolicitud} /></td></tr>}
      </Fragment>)}</tbody>
    </table>
  </div>
}
