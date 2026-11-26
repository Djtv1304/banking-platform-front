import { PERMISOS, usePuedeFuncion, usePermisos } from '@/features/auth'
import { etiquetaContable, presentacionSolicitudPlantilla } from '@/features/contabilidad/lib/etiquetas'
import { useState } from 'react'
import { ResumenNumeracion } from '@/features/organizacion/components/ResumenNumeracion'
import { Link, useParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { comentarioSchema, type Accion } from '@/features/aprobaciones/api/aprobaciones.contract'
import { useDetalleAprobacion, useResolverAprobacion } from '@/features/aprobaciones/hooks/useAprobaciones'
import { responsable } from '@/features/aprobaciones/lib/presentacion'
import { Aviso, Badge, Button, Cargando, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Label } from '@/shared/ui'
import { ComparadorCambios } from '@/shared/ui/comparador-cambios'
import { toApiError } from '@/shared/api'
import { ErrorApi } from '@/shared/ui/error-api'
import { LineaDeTiempo } from '@/shared/ui/linea-de-tiempo'
import { ResumenCambioProducto } from '@/features/organizacion'

const etiquetas: Record<Accion, string> = { aprobar: 'Aprobar', rechazar: 'Rechazar', cancelar: 'Cancelar solicitud' }
export function DetalleAprobacionPage() {
  const id = Number(useParams().idSolicitud)
  const permisos = usePermisos()
  const puedeConsultarPlantilla = usePuedeFuncion('contabilidad.plantillas.consultar', permisos.includes(PERMISOS.plantillasEditar))
  const detalle = useDetalleAprobacion(id)
  const resolver = useResolverAprobacion(id, detalle.data?.codigoTransaccion)
  const [accion, setAccion] = useState<Accion | null>(null)
  const [mensaje, setMensaje] = useState('')
  const [verificar, setVerificar] = useState<'estado' | 'recuperacion' | null>(null)
  const form = useForm<{ comentario: string }>({ resolver: zodResolver(comentarioSchema(accion ?? 'aprobar')), defaultValues: { comentario: '' } })
  if (!Number.isSafeInteger(id) || id < 1) return <Aviso tono="error">El numero de solicitud no es valido.</Aviso>
  if (detalle.isPending) return <Cargando texto="Cargando solicitud..." />
  if (detalle.isError) return <ErrorApi error={detalle.error} reintentar={() => void detalle.refetch()} />
  const s = detalle.data
  const esPlantilla = s.codigoTransaccion === 'CON-PLANTILLA' || s.tipoObjetivo === 'PlantillaAsiento'
  const esTarjeta = s.codigoTransaccion === 'TAR-SOLICITAR' && s.tipoObjetivo === 'Tarjeta' && /^[1-9]\d*$/.test(s.idObjetivo)
  const permitido = accion === 'aprobar' ? s.puedeAprobar : accion === 'rechazar' ? s.puedeRechazar : s.puedeCancelar
  const bloqueado = Boolean(verificar) || s.estado !== 'Pendiente'
  const actualizar = async () => {
    const resultado = await detalle.refetch()
    if (!resultado.isError && resultado.data &&
      (verificar !== 'recuperacion' || resultado.data.estado !== 'Pendiente')) {
      setVerificar(null)
      if (verificar === 'recuperacion') setMensaje('')
    }
  }
  function abrir(nueva: Accion) { resolver.reset(); form.reset(); setAccion(nueva) }
  const enviar = form.handleSubmit(async ({ comentario }) => {
    if (!accion || !permitido || bloqueado || resolver.isPending) return
    try {
      const resultado = await resolver.mutateAsync({ accion, comentario })
      setMensaje(resultado.estado === 'Ejecutada' ? 'La operacion fue aplicada y auditada.' : `La solicitud quedo ${resultado.estado.toLowerCase()}.`)
      setAccion(null)
    } catch (error) {
      const { code, status } = toApiError(error)
      if (code === 'APROBACION_PENDIENTE_RECUPERACION') {
        setVerificar('recuperacion')
        setMensaje('La aprobaci\u00f3n est\u00e1 en recuperaci\u00f3n. Consulta el estado de esta misma solicitud.')
        setAccion(null)
      } else if (code === 'RECHAZO_PENDIENTE_RECUPERACION') {
        setMensaje('El rechazo quedó registrado. El sistema aplicará la anulación en segundo plano.')
        setAccion(null)
      } else if (status === null || status >= 500 || code === 'RESPUESTA_APROBACION_INVALIDA') {
        setVerificar('estado')
      }
    }
  })
  return <section className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
    <Link to="/aprobaciones" className="rounded text-sm text-link underline focus-visible:outline-2">Volver a aprobaciones</Link>
    <header><div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-semibold text-heading">Solicitud #{s.idSolicitud}</h1><Badge variant="outline">{s.estado}</Badge></div><p className="mt-2 text-muted-foreground">{esPlantilla ? etiquetaContable(s.tipoObjetivo) : s.tipoObjetivo}: {s.idObjetivo} · {s.idAgencia ? `Agencia ${s.idAgencia}` : 'Alcance institucional'}</p><p className="mt-1 text-sm">Solicitante: {responsable(s.solicitante)}</p>{s.resolutor && <p className="text-sm">Responsable de la decision: {responsable(s.resolutor)}</p>}</header>
    {s.codigoTransaccion === 'SEG-USUARIO-ROLES' && /^[1-9]\d*$/.test(s.idObjetivo) &&
      <p><Link className="text-link underline" to={'/usuarios/' + s.idObjetivo}>Consultar ficha del usuario</Link></p>}
    {esPlantilla && puedeConsultarPlantilla && /^[1-9]\d*$/.test(s.idObjetivo) &&
      <p><Link className="text-link underline" to={'/contabilidad/plantillas?version=' + s.idObjetivo}>Consultar movimientos de la versión</Link></p>}
    {esTarjeta && <p><Link className="text-link underline" to={`/tarjetas/${s.idObjetivo}`}>Consultar tarjeta {s.idObjetivo}</Link></p>}
    {mensaje && <Aviso>{mensaje}</Aviso>}
    {s.estado === 'Aprobada' && <Aviso>La aprobacion esta registrada. La aplicacion requiere confirmacion o recuperacion; todavia no se presenta como ejecutada.</Aviso>}
    {s.codigoError && <Aviso tono="error">La solicitud no se completo: {s.codigoError}.</Aviso>}
    {s.codigoTransaccion === 'PRD-NUMERACION' && s.tipoObjetivo === 'SubProducto' ? <ResumenNumeracion solicitud={s} /> : s.codigoTransaccion === 'PRD-CONDICION' && s.tipoObjetivo === 'SubProducto' ? <ResumenCambioProducto solicitud={s} /> : <section className="space-y-3" aria-label="Cambio propuesto"><h2 className="text-lg font-semibold">Cambios solicitados</h2><ComparadorCambios antes={s.antes} despues={s.despues} presentacion={esPlantilla ? presentacionSolicitudPlantilla : undefined} /></section>}
    <div className="flex flex-wrap gap-3">{!bloqueado && s.puedeAprobar && <Button onClick={() => abrir('aprobar')}>Aprobar</Button>}{!bloqueado && s.puedeRechazar && <Button variant="outline" onClick={() => abrir('rechazar')}>Rechazar</Button>}{!bloqueado && s.puedeCancelar && <Button variant="outline" onClick={() => abrir('cancelar')}>Cancelar solicitud</Button>}<Button variant="outline" disabled={detalle.isFetching} onClick={() => void actualizar()}>Actualizar estado</Button></div>
    <section className="space-y-4"><h2 className="text-lg font-semibold">Historial</h2><LineaDeTiempo eventos={s.eventos.map((e, i) => ({ clave: `${i}-${e.fechaEvento}`, etiqueta: e.estadoNuevo, fecha: e.fechaEvento, responsable: e.responsable ? responsable(e.responsable) : 'Sistema', comentario: e.comentario }))} /></section>
    <Dialog open={accion !== null} onOpenChange={(open) => { if (!open && !resolver.isPending) setAccion(null) }}><DialogContent><DialogHeader><DialogTitle>{accion ? etiquetas[accion] : 'Resolver solicitud'}</DialogTitle><DialogDescription>{accion === 'aprobar' ? 'Confirma que revisaste la comparacion. El backend revalidara permisos y el estado del objetivo.' : accion === 'rechazar' ? (esTarjeta ? 'Indica el motivo. El rechazo anulará la solicitud de tarjeta.' : 'El rechazo requiere un motivo. No se aplicara el cambio propuesto.') : 'Se cancelara esta solicitud sin cambiar el objetivo.'}</DialogDescription></DialogHeader>
      <form onSubmit={enviar} className="space-y-4"><div className="space-y-2"><Label htmlFor="comentario-aprobacion">Comentario{accion === 'rechazar' ? ' obligatorio' : ' opcional'}</Label><textarea id="comentario-aprobacion" maxLength={300} rows={3} {...form.register('comentario')} aria-invalid={Boolean(form.formState.errors.comentario)} aria-describedby={form.formState.errors.comentario ? 'comentario-error' : undefined} className="w-full rounded-lg border border-input bg-field p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />{form.formState.errors.comentario && <p id="comentario-error" role="alert" className="text-sm text-destructive">{form.formState.errors.comentario.message}</p>}</div>
        {resolver.isError && <ErrorApi error={resolver.error} />}
        {verificar && <Button type="button" variant="outline" disabled={detalle.isFetching} onClick={() => void actualizar()}>Consultar estado de la solicitud</Button>}<DialogFooter><Button type="button" variant="outline" disabled={resolver.isPending} onClick={() => setAccion(null)}>Volver</Button><Button type="submit" disabled={resolver.isPending || bloqueado || !permitido}>{resolver.isPending ? 'Procesando...' : accion ? etiquetas[accion] : 'Confirmar'}</Button></DialogFooter></form>
    </DialogContent></Dialog>
  </section>
}
