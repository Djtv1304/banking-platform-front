import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth'
import { toApiError } from '@/shared/api'
import { Aviso, AvisoRequiereAprobacion, Button, Cargando, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input, LineaDeTiempo } from '@/shared/ui'
import { consultarVigencias, programarConjunto, cancelarConjunto, finalizarRestriccion } from '@/features/organizacion/api/programacion.api'
import { obtenerFicha, obtenerCupos } from '@/features/organizacion/api/productos.api'
import type { ClaseConjunto, VigenciasProducto } from '@/features/organizacion/api/programacion.contract'
import { LineaVigencias, type EventoVigencia } from '@/features/organizacion/components/LineaVigencias'
import { ProgramacionForm } from '@/features/organizacion/components/ProgramacionForm'
import type { CupoCanal } from '@/features/organizacion/api/productos.contract'

const NOMBRES: Record<ClaseConjunto, string> = { condiciones: 'Condiciones', cupos: 'Cupos por canal', restricciones: 'Restricciones' }
interface Confirmacion { clase: ClaseConjunto; id: number; accion: 'cancelar' | 'fin'; titulo: string }
export function ProgramacionSubProductoPage() {
  const { idSubProducto = '' } = useParams(), id = Number(idSubProducto)
  const valido = Number.isSafeInteger(id) && id > 0
  const usuario = useAuthStore(s => s.user)
  const cliente = useQueryClient()
  const ficha = useQuery({ queryKey: ['productos', 'ficha', id], queryFn: () => obtenerFicha(id), enabled: valido })
  const vigencias = useQuery({ queryKey: ['productos', 'vigencias', id], queryFn: ({ signal }) => consultarVigencias(id, signal), enabled: valido })
  const canales = useQuery({ queryKey: ['productos', 'cupos', id], queryFn: () => obtenerCupos(id), enabled: valido && ficha.data !== undefined && ficha.data.producto.tipoProducto !== 'Credito' })
  const [tab, setTab] = useState<ClaseConjunto>('condiciones')
  const [formulario, setFormulario] = useState(false), [solicitud, setSolicitud] = useState<number | null>(null)
  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null), [fechaFinal, setFechaFinal] = useState('')
  const refrescar = () => Promise.all([cliente.invalidateQueries({ queryKey: ['productos'] }), cliente.invalidateQueries({ queryKey: ['aprobaciones'] }), cliente.invalidateQueries({ queryKey: ['productosAdmin'] })])
  const enviado = (r: { idSolicitud: number }) => { setSolicitud(r.idSolicitud); setFormulario(false); setConfirmacion(null); void refrescar() }
  const programar = useMutation({ mutationFn: (datos: Record<string, unknown>) => programarConjunto(id, tab, datos), onSuccess: enviado })
  const confirmar = useMutation({ mutationFn: (c: Confirmacion) => c.accion === 'fin' ? finalizarRestriccion(id, c.id, fechaFinal) : cancelarConjunto(id, c.clase, c.id), onSuccess: enviado })
  if (!valido) return <Aviso tono="error">El identificador del subproducto no es valido.</Aviso>
  if (ficha.isPending || vigencias.isPending) return <Cargando texto="Cargando condiciones del subproducto..." />
  if (ficha.isError || vigencias.isError) return <Aviso tono="error">{toApiError(ficha.error ?? vigencias.error).message}</Aviso>
  const data = vigencias.data, tipo = ficha.data.producto.tipoProducto
  const pendientes = data.solicitudes.filter(s => s.estado === 'Pendiente' || s.estado === 'Aprobada')
  const puede = usuario?.roles.includes('ADMIN') && usuario.permisos.includes('prd-condicion') && ficha.data.subproducto.estadoCatalogo !== 'Retirado'
  const tabs: ClaseConjunto[] = tipo === 'Cuenta' ? ['condiciones', 'cupos', 'restricciones'] : tipo === 'Tarjeta' ? ['condiciones', 'cupos'] : ['condiciones']
  const filas = filasDeVigencia(data, tab, canales.data ?? [])
  const actuales = filas.filter(v => v.estado === 'Vigente')
  const futuros = filas.filter(v => v.estado === 'Programado')
  const cancelar = (idRegistro: number, titulo: string, accion: 'cancelar' | 'fin' = 'cancelar') => { confirmar.reset(); setFechaFinal(data.fechaConsulta); setConfirmacion({ clase: tab, id: idRegistro, titulo, accion }) }
  return <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
    <Link className="text-primary underline" to={`/productos/${ficha.data.producto.idProducto}`}>Volver al producto</Link>
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-muted-foreground">{ficha.data.producto.nombreProducto}</p><h1 className="text-3xl font-bold text-heading">{ficha.data.subproducto.nombreSubProducto}</h1><p className="mt-2 text-muted-foreground">Condiciones, cupos y restricciones con vigencia.</p></div><Button variant="outline" onClick={() => void refrescar()} disabled={vigencias.isFetching}>Actualizar</Button></header>
    {solicitud && <AvisoRequiereAprobacion idSolicitud={solicitud} />}
    {pendientes.map(s => <Aviso key={s.idSolicitud}>Hay una solicitud {s.estado.toLowerCase()} para este subproducto. <Link className="underline" to={`/aprobaciones/${s.idSolicitud}`}>Ver solicitud #{s.idSolicitud}</Link></Aviso>)}
    {!puede && <Aviso>Consulta de solo lectura. La programacion requiere el permiso de condiciones de productos.</Aviso>}
    <div role="tablist" aria-label="Configuracion del subproducto" className="flex flex-wrap gap-2">{tabs.map(t => <Button key={t} role="tab" aria-selected={tab === t} variant={tab === t ? 'default' : 'outline'} onClick={() => setTab(t)}>{NOMBRES[t]}</Button>)}</div>
    <section role="tabpanel" aria-label={NOMBRES[tab]} className="rounded-3xl border border-border bg-card p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">{NOMBRES[tab]}</h2>{puede && <Button disabled={pendientes.length > 0 || (tab === 'cupos' && !canales.isSuccess)} onClick={() => { programar.reset(); setFormulario(true) }}>Programar nuevo conjunto</Button>}</div>
      {canales.isError && tab === 'cupos' && <Aviso tono="error">{toApiError(canales.error).message}</Aviso>}
      <h3 className="mb-3 font-semibold">Vigente</h3>{actuales.length ? <LineaVigencias eventos={actuales} /> : <p className="text-muted-foreground">No hay un conjunto vigente para este tipo.</p>}
      {tab === 'restricciones' && puede && pendientes.length === 0 && actuales.map(v => <Button key={v.id} variant="outline" className="mt-3" onClick={() => cancelar(v.id, v.titulo, 'fin')}>Programar fin: {v.titulo}</Button>)}
      <h3 className="mb-3 mt-7 font-semibold">Programados</h3>{futuros.length ? <div className="space-y-4">{futuros.map(v => {
        const idCancelacion = tab !== 'cupos' ? v.id : v.id < 0 ? -v.id : data.cupos.find(c => c.idProductoCanalCupo === v.id)?.idSolicitud
        return <div key={v.id} className="rounded-xl border border-border p-4"><LineaVigencias eventos={[v]} />{puede && pendientes.length === 0 && (idCancelacion ? <Button variant="outline" className="mt-3" onClick={() => cancelar(idCancelacion, v.titulo)}>Cancelar programacion</Button> : <p className="mt-3 text-sm text-muted-foreground">Registro anterior sin solicitud verificable. Requiere revision de trazabilidad.</p>)}</div>
      })}</div> : <p className="text-muted-foreground">Sin conjuntos futuros aprobados.</p>}
      <h3 className="mb-3 mt-7 font-semibold">Historial completo</h3><p className="mb-4 text-sm text-muted-foreground">Los conjuntos registrados son de solo lectura. Una correccion se programa como un conjunto nuevo.</p>{filas.length ? <LineaVigencias eventos={filas} /> : <p>Sin historial.</p>}
    </section>
    <section className="rounded-3xl border border-border bg-card p-6"><h2 className="mb-4 text-xl font-semibold">Solicitudes y aprobaciones</h2>{data.solicitudes.length ? <><LineaDeTiempo etiqueta="Solicitudes del subproducto" eventos={data.solicitudes.map(s => ({ clave: String(s.idSolicitud), etiqueta: `${NOMBRES[s.clase]} - ${s.estado}`, fecha: s.fecha, responsable: s.responsable }))} /><div className="mt-4 flex flex-wrap gap-3">{data.solicitudes.map(s => <Link key={s.idSolicitud} className="text-sm text-primary underline" to={`/aprobaciones/${s.idSolicitud}`}>Solicitud #{s.idSolicitud}</Link>)}</div></> : <p className="text-muted-foreground">No hay solicitudes registradas.</p>}</section>
    <Dialog open={formulario} onOpenChange={v => { if (!programar.isPending) setFormulario(v) }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-5xl"><DialogHeader><DialogTitle>Programar {NOMBRES[tab].toLowerCase()}</DialogTitle><DialogDescription>{ficha.data.subproducto.nombreSubProducto}</DialogDescription></DialogHeader>{programar.isError && <Aviso tono="error">{toApiError(programar.error).message}</Aviso>}<ProgramacionForm key={tab} clase={tab} fecha={data.fechaConsulta} vigencias={data} canales={canales.data ?? []} ocupado={programar.isPending} onEnviar={datos => programar.mutate(datos)} onCerrar={() => setFormulario(false)} /></DialogContent></Dialog>
    <Dialog open={confirmacion !== null} onOpenChange={v => { if (!v && !confirmar.isPending) setConfirmacion(null) }}><DialogContent><DialogHeader><DialogTitle>{confirmacion?.accion === 'fin' ? 'Programar fin de restriccion' : 'Cancelar programacion futura'}</DialogTitle><DialogDescription>{confirmacion?.titulo}. El cambio requiere aprobacion de otra persona y conservara el conjunto vigente.</DialogDescription></DialogHeader>{confirmacion?.accion === 'fin' && <label className="flex flex-col gap-2 text-sm">Fecha final<Input type="date" min={data.fechaConsulta} value={fechaFinal} onChange={e => setFechaFinal(e.target.value)} /></label>}{confirmar.isError && <Aviso tono="error">{toApiError(confirmar.error).message}</Aviso>}<div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setConfirmacion(null)} disabled={confirmar.isPending}>Volver</Button><Button onClick={() => confirmacion && confirmar.mutate(confirmacion)} disabled={confirmar.isPending || !confirmacion}>Enviar a aprobacion</Button></div></DialogContent></Dialog>
  </div>
}

function filasDeVigencia(data: VigenciasProducto, clase: ClaseConjunto, canales: CupoCanal[]): EventoVigencia[] {
  const estado = (activo: boolean, desde: string, hasta: string | null) => !activo ? 'Inactivo o cancelado' : desde > data.fechaConsulta ? 'Programado' : hasta && hasta < data.fechaConsulta ? 'Historico' : 'Vigente'
  if (clase === 'condiciones') return data.condiciones.map(v => ({ id: v.idCondicion, titulo: `Apertura ${v.montoAperturaMinimo} USD; saldo ${v.saldoMinimo} USD; tasa ${v.tasaInteresAnual}% (${v.periodicidadInteres ?? 'sin periodicidad'}); mantenimiento ${v.costoMantenimiento} USD (${v.periodicidadCosto ?? 'sin periodicidad'}); inactividad ${v.mesesInactividad ?? 'no definida'} meses; ${v.aplicaACuentasExistentes ? 'incluye' : 'no incluye'} cuentas existentes`, desde: v.vigenciaDesde, hasta: v.vigenciaHasta, estado: estado(v.estado === 'Vigente' || v.estado === 'Programada', v.vigenciaDesde, v.vigenciaHasta), responsable: v.responsable }))
  if (clase === 'cupos') {
    const eventos = data.cupos.map(v => ({ id: v.idProductoCanalCupo, titulo: `${canales.find(c => c.idCanal === v.idCanal)?.nombreCanal ?? `Canal ${v.idCanal}`}: por transaccion ${v.montoMaxTransaccion}, diario ${v.cupoDiarioMaximo}, mensual ${v.cupoMensualMaximo} USD; ${v.maxTransaccionesDia} transacciones/dia`, desde: v.vigenciaDesde, hasta: v.vigenciaHasta, estado: estado(v.estadoCupo === 'A', v.vigenciaDesde, v.vigenciaHasta), responsable: v.responsable }))
    for (const s of data.solicitudes) {
      if (s.clase !== 'cupos' || s.accion !== 'programar' || s.estado !== 'Ejecutada' || !s.datos || !Array.isArray(s.datos.cupos) || s.datos.cupos.length !== 0) continue
      const cancelada = data.solicitudes.some(c => c.accion === 'cancelar' && c.estado === 'Ejecutada' && c.idOrigen === s.idSolicitud)
      const desde = String(s.datos.vigenciaDesde), hasta = s.datos.vigenciaHasta == null ? null : String(s.datos.vigenciaHasta)
      eventos.push({ id: -s.idSolicitud, titulo: 'Todos los canales sin cupo', desde, hasta, estado: estado(!cancelada, desde, hasta), responsable: s.responsable })
    }
    return eventos
  }
  return data.restricciones.map(v => ({ id: v.idRestriccion, titulo: `${v.descripcion}${v.dias ? ` (${v.dias} dias)` : ''}${v.monto ? ` (${v.monto} USD)` : ''}${v.cantidad ? ` (${v.cantidad})` : ''}`, desde: v.vigenciaDesde, hasta: v.vigenciaHasta, estado: estado(v.estado === 'A', v.vigenciaDesde, v.vigenciaHasta), responsable: v.responsable }))
}
