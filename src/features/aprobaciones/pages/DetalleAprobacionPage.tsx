import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { comentarioSchema, type Accion } from '@/features/aprobaciones/api/aprobaciones.contract'
import { useDetalleAprobacion, useResolverAprobacion } from '@/features/aprobaciones/hooks/useAprobaciones'
import { responsable } from '@/features/aprobaciones/lib/presentacion'
import { Aviso, Badge, Button, Cargando, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Label } from '@/shared/ui'
import { ComparadorCambios } from '@/shared/ui/comparador-cambios'
import { ErrorApi } from '@/shared/ui/error-api'
import { LineaDeTiempo } from '@/shared/ui/linea-de-tiempo'
import { ResumenCambioProducto } from '@/features/organizacion'

const etiquetas: Record<Accion, string> = { aprobar: 'Aprobar', rechazar: 'Rechazar', cancelar: 'Cancelar solicitud' }
export function DetalleAprobacionPage() {
  const id = Number(useParams().idSolicitud)
  const detalle = useDetalleAprobacion(id)
  const resolver = useResolverAprobacion(id, detalle.data?.codigoTransaccion)
  const [accion, setAccion] = useState<Accion | null>(null)
  const [mensaje, setMensaje] = useState('')
  const form = useForm<{ comentario: string }>({ resolver: zodResolver(comentarioSchema(accion ?? 'aprobar')), defaultValues: { comentario: '' } })
  if (!Number.isSafeInteger(id) || id < 1) return <Aviso tono="error">El numero de solicitud no es valido.</Aviso>
  if (detalle.isPending) return <Cargando texto="Cargando solicitud..." />
  if (detalle.isError) return <ErrorApi error={detalle.error} reintentar={() => void detalle.refetch()} />
  const s = detalle.data
  function abrir(nueva: Accion) { resolver.reset(); form.reset(); setAccion(nueva) }
  const enviar = form.handleSubmit(async ({ comentario }) => {
    if (!accion) return
    try {
      const resultado = await resolver.mutateAsync({ accion, comentario })
      setMensaje(resultado.estado === 'Ejecutada' ? 'La operacion fue aplicada y auditada.' : `La solicitud quedo ${resultado.estado.toLowerCase()}.`)
      setAccion(null)
    } catch { /* El error real permanece en la mutacion y se muestra en el dialogo. */ }
  })
  return <section className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
    <Link to="/aprobaciones" className="rounded text-sm text-link underline focus-visible:outline-2">Volver a aprobaciones</Link>
    <header><div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-semibold text-heading">Solicitud #{s.idSolicitud}</h1><Badge variant="outline">{s.estado}</Badge></div><p className="mt-2 text-muted-foreground">{s.tipoObjetivo}: {s.idObjetivo} · {s.idAgencia ? `Agencia ${s.idAgencia}` : 'Alcance institucional'}</p><p className="mt-1 text-sm">Solicitante: {responsable(s.solicitante)}</p>{s.resolutor && <p className="text-sm">Responsable de la decision: {responsable(s.resolutor)}</p>}</header>
    {mensaje && <Aviso>{mensaje}</Aviso>}
    {s.estado === 'Aprobada' && <Aviso>La aprobacion esta registrada. La aplicacion requiere confirmacion o recuperacion; todavia no se presenta como ejecutada.</Aviso>}
    {s.codigoError && <Aviso tono="error">La solicitud no se completo: {s.codigoError}.</Aviso>}
    {s.codigoTransaccion === 'PRD-CONDICION' && s.tipoObjetivo === 'SubProducto' ? <ResumenCambioProducto solicitud={s} /> : <section className="space-y-3" aria-label="Cambio propuesto"><h2 className="text-lg font-semibold">Cambios solicitados</h2><ComparadorCambios antes={s.antes} despues={s.despues} /></section>}
    <div className="flex flex-wrap gap-3">{s.puedeAprobar && <Button onClick={() => abrir('aprobar')}>Aprobar</Button>}{s.puedeRechazar && <Button variant="outline" onClick={() => abrir('rechazar')}>Rechazar</Button>}{s.puedeCancelar && <Button variant="outline" onClick={() => abrir('cancelar')}>Cancelar solicitud</Button>}<Button variant="outline" disabled={detalle.isFetching} onClick={() => void detalle.refetch()}>Actualizar estado</Button></div>
    <section className="space-y-4"><h2 className="text-lg font-semibold">Historial</h2><LineaDeTiempo eventos={s.eventos.map((e, i) => ({ clave: `${i}-${e.fechaEvento}`, etiqueta: e.estadoNuevo, fecha: e.fechaEvento, responsable: e.responsable ? responsable(e.responsable) : 'Sistema', comentario: e.comentario }))} /></section>
    <Dialog open={accion !== null} onOpenChange={(open) => { if (!open && !resolver.isPending) setAccion(null) }}><DialogContent><DialogHeader><DialogTitle>{accion ? etiquetas[accion] : 'Resolver solicitud'}</DialogTitle><DialogDescription>{accion === 'aprobar' ? 'Confirma que revisaste la comparacion. El backend revalidara permisos y el estado del objetivo.' : accion === 'rechazar' ? 'El rechazo requiere un motivo. No se aplicara el cambio propuesto.' : 'Se cancelara esta solicitud sin cambiar el objetivo.'}</DialogDescription></DialogHeader>
      <form onSubmit={enviar} className="space-y-4"><div className="space-y-2"><Label htmlFor="comentario-aprobacion">Comentario{accion === 'rechazar' ? ' obligatorio' : ' opcional'}</Label><textarea id="comentario-aprobacion" maxLength={300} rows={3} {...form.register('comentario')} aria-invalid={Boolean(form.formState.errors.comentario)} aria-describedby={form.formState.errors.comentario ? 'comentario-error' : undefined} className="w-full rounded-lg border border-input bg-field p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />{form.formState.errors.comentario && <p id="comentario-error" role="alert" className="text-sm text-destructive">{form.formState.errors.comentario.message}</p>}</div>
        {resolver.isError && <ErrorApi error={resolver.error} />}<DialogFooter><Button type="button" variant="outline" disabled={resolver.isPending} onClick={() => setAccion(null)}>Volver</Button><Button type="submit" disabled={resolver.isPending}>{resolver.isPending ? 'Procesando...' : accion ? etiquetas[accion] : 'Confirmar'}</Button></DialogFooter></form>
    </DialogContent></Dialog>
  </section>
}
