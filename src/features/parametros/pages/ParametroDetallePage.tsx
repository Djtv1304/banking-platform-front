import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuthStore } from '@/features/auth'
import { toApiError } from '@/shared/api'
import { Aviso, AvisoRequiereAprobacion, LineaDeTiempo, Button, Cargando, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input } from '@/shared/ui'
import { cancelarValor, consultarParametro, programarValor } from '@/features/parametros/api/parametros.api'
import { entradaSchema, type EntradaValor, type Parametro, type ValorParametro } from '@/features/parametros/api/parametros.contract'
import { hoyEcuador, validarValor } from '@/features/parametros/lib/validacion'

export function ParametroDetallePage() {
  const { clave = '' } = useParams()
  const [search] = useSearchParams()
  const usuario = useAuthStore(s => s.user)
  const agencia = search.get('idAgencia') || usuario?.idAgencia || null
  const cliente = useQueryClient()
  const [formulario, setFormulario] = useState(false)
  const [cancelar, setCancelar] = useState<ValorParametro | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [solicitud, setSolicitud] = useState<number | null>(null)
  const parametro = useQuery({ queryKey: ['parametros', usuario?.idUsuario, usuario?.idAgencia, clave, agencia], queryFn: ({ signal }) => consultarParametro(clave, agencia, signal) })
  const refrescar = () => cliente.invalidateQueries({ queryKey: ['parametros'] })
  const cancelacion = useMutation({ mutationFn: (v: ValorParametro) => cancelarValor(clave, v.idParametroValor, v.idAgencia), onSuccess: () => { setCancelar(null); setMensaje('Programacion cancelada. El valor anterior se conserva.'); void refrescar() } })
  if (parametro.isPending) return <Cargando texto="Cargando detalle del parametro..." />
  if (parametro.isError) return <Aviso tono="error">{toApiError(parametro.error).message}</Aviso>
  const p = parametro.data
  const puedeEditar = p.puedeEditar && p.estado === 'A'
  return <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
    <Link to="/parametros" className="text-sm text-primary underline">Volver a parametros</Link>
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-muted-foreground">{p.modulo}</p><h1 className="text-3xl font-bold text-heading">{p.descripcion}</h1><p className="mt-2 text-muted-foreground">{p.clave}</p></div><Button variant="outline" disabled={parametro.isFetching} onClick={() => { setSolicitud(null); void parametro.refetch() }}>Actualizar</Button>{puedeEditar && <Button onClick={() => { setMensaje(null); setFormulario(true) }}>Programar valor</Button>}</header>
    {mensaje && <Aviso>{mensaje}</Aviso>}
    {solicitud && <AvisoRequiereAprobacion idSolicitud={solicitud} />}
    {p.esSensible && <Aviso>Este parametro requiere aprobacion de otra persona. Guardar una propuesta no cambia el valor vigente.</Aviso>}
    <section className="grid gap-4 rounded-3xl border border-border bg-card p-6 sm:grid-cols-3" aria-label="Definicion"><div><p className="text-sm text-muted-foreground">Tipo y unidad</p><p>{p.tipoDato} {p.unidad ?? ''}</p></div><div><p className="text-sm text-muted-foreground">Rango permitido</p><p>{p.minimo ?? 'Sin minimo'} / {p.maximo ?? 'Sin maximo'}</p></div><div><p className="text-sm text-muted-foreground">Alcance consultado</p><p>{p.agenciaConsultada ? `Agencia ${p.agenciaConsultada}; incluye respaldo global` : 'Global'}</p><p className="text-xs text-muted-foreground">{p.admiteAgencia ? 'Admite valores por agencia' : 'Solo valores globales'}</p></div></section>
    <section className="rounded-3xl border border-border bg-card p-6"><h2 className="mb-3 text-xl font-semibold">Valor vigente</h2>{p.valorActual ? <><p className="break-words text-3xl font-semibold">{p.valorActual.valor} {p.unidad}</p><p className="mt-2 text-sm text-muted-foreground">Desde {p.valorActual.vigenciaDesde} · {p.valorActual.idAgencia ? `Agencia ${p.valorActual.idAgencia}` : 'Global'}</p></> : <Aviso>No existe un valor vigente para este alcance.</Aviso>}</section>
    <section className="rounded-3xl border border-border bg-card p-6"><h2 className="mb-4 text-xl font-semibold">Proximos valores</h2>{p.valoresProgramados.length === 0 ? <p className="text-muted-foreground">Sin valores programados aprobados.</p> : <ul className="space-y-3">{p.valoresProgramados.map(v => <li key={v.idParametroValor} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"><div><strong className="break-words">{v.valor}</strong><p className="text-sm text-muted-foreground">Desde {v.vigenciaDesde} · {v.idAgencia ? `Agencia ${v.idAgencia}` : 'Global'}</p></div>{puedeEditar && v.vigenciaDesde > hoyEcuador() && <Button variant="outline" onClick={() => { cancelacion.reset(); setCancelar(v) }}>Cancelar programacion</Button>}</li>)}</ul>}</section>
    <section className="rounded-3xl border border-border bg-card p-6"><h2 className="mb-4 text-xl font-semibold">Historial</h2><p className="mb-5 text-sm text-muted-foreground">Los valores historicos son de solo lectura. Una correccion registra un valor nuevo desde hoy.</p>{p.historial.length === 0 ? <p>Sin historial.</p> : <LineaDeTiempo etiqueta="Historial del parametro" eventos={p.historial.map(v => ({ clave: String(v.idParametroValor), etiqueta: `${v.valor} - ${v.estado === 'C' ? 'Cancelado' : v.vigenciaDesde > p.fechaConsulta ? 'Programado' : v.vigenciaHasta && v.vigenciaHasta < p.fechaConsulta ? 'Historico' : 'Vigente'}`, fecha: v.fechaCreacion, responsable: v.responsable, comentario: `Vigencia desde ${v.vigenciaDesde} hasta ${v.vigenciaHasta ?? 'sin fecha final'}. ${v.idAgencia ? `Agencia ${v.idAgencia}` : 'Global'}.` }))} />}</section>
    {formulario && <ValorForm parametro={p} alCerrar={() => setFormulario(false)} alGuardar={(m, id) => { setFormulario(false); setSolicitud(id ?? null); setMensaje(id ? null : m); void refrescar() }} />}
    <Dialog open={cancelar !== null} onOpenChange={abierto => { if (!abierto && !cancelacion.isPending) setCancelar(null) }}><DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto"><DialogHeader><DialogTitle>Cancelar valor futuro</DialogTitle><DialogDescription>Se cancelara el valor {cancelar?.valor} previsto desde {cancelar?.vigenciaDesde}. Se conservara la continuidad del valor anterior.</DialogDescription></DialogHeader>{cancelacion.isError && <Aviso tono="error">{toApiError(cancelacion.error).message}</Aviso>}<DialogFooter><Button variant="outline" disabled={cancelacion.isPending} onClick={() => setCancelar(null)}>Volver</Button><Button disabled={cancelacion.isPending || !cancelar} onClick={() => cancelar && cancelacion.mutate(cancelar)}>{cancelacion.isPending ? 'Cancelando...' : 'Confirmar cancelacion'}</Button></DialogFooter></DialogContent></Dialog>
  </div>
}

function ValorForm({ parametro: p, alCerrar, alGuardar }: { parametro: Parametro; alCerrar: () => void; alGuardar: (mensaje: string, id?: number) => void }) {
  const form = useForm<EntradaValor>({ resolver: zodResolver(entradaSchema), defaultValues: { valor: '', vigenciaDesde: hoyEcuador(), idAgencia: p.admiteAgencia ? p.agenciaConsultada : null } })
  const mutacion = useMutation({ mutationFn: (entrada: EntradaValor) => programarValor(p.clave, entrada), onSuccess: r => r.tipo === 'pendiente' ? alGuardar('', r.idSolicitud) : alGuardar('Valor registrado correctamente.') })
  const enviar = form.handleSubmit(entrada => {
    if (entrada.vigenciaDesde < p.fechaConsulta) { form.setError('vigenciaDesde', { message: 'La fecha no puede ser anterior a hoy.' }); return }
    const error = validarValor(p, entrada, p.fechaConsulta)
    if (error) { form.setError('valor', { message: error }); return }
    mutacion.mutate(entrada)
  })
  return <Dialog open onOpenChange={abierto => { if (!abierto && !mutacion.isPending) alCerrar() }}><DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto"><DialogHeader><DialogTitle>Programar valor nuevo</DialogTitle><DialogDescription>{p.clave} · {p.tipoDato} · {p.admiteAgencia && p.agenciaConsultada ? `Agencia ${p.agenciaConsultada}` : 'Global'}</DialogDescription></DialogHeader><form noValidate onSubmit={enviar} className="space-y-5">
    {p.esSensible && <Aviso>Requiere aprobacion. Esta propuesta no entrara en vigor hasta que otra persona autorizada la apruebe.</Aviso>}
    <label className="flex flex-col gap-2 text-sm">Valor ({p.tipoDato}){p.tipoDato === 'Booleano' ? <select className="rounded-lg border border-border bg-field p-3" {...form.register('valor')}><option value="">Seleccione</option><option value="true">Verdadero</option><option value="false">Falso</option></select> : <Input autoFocus type={p.tipoDato === 'Hora' ? 'time' : 'text'} maxLength={500} aria-invalid={!!form.formState.errors.valor} {...form.register('valor')} />}<span className="text-xs text-muted-foreground">{p.minimo !== null || p.maximo !== null ? `Rango: ${p.minimo ?? 'sin minimo'} a ${p.maximo ?? 'sin maximo'}.` : ''}{p.tipoDato === 'Lista' ? ' Lista JSON de textos.' : ''}</span>{form.formState.errors.valor && <span role="alert" className="text-destructive">{form.formState.errors.valor.message}</span>}</label>
    <label className="flex flex-col gap-2 text-sm">Fecha de inicio<Input type="date" min={hoyEcuador()} {...form.register('vigenciaDesde')} aria-invalid={!!form.formState.errors.vigenciaDesde} />{form.formState.errors.vigenciaDesde && <span role="alert">Ingrese una fecha valida desde hoy.</span>}</label>
    {mutacion.isError && <Aviso tono="error">{toApiError(mutacion.error).message}</Aviso>}
    <DialogFooter><Button type="button" variant="outline" disabled={mutacion.isPending} onClick={alCerrar}>Volver</Button><Button type="submit" disabled={mutacion.isPending}>{mutacion.isPending ? 'Guardando...' : p.esSensible ? 'Enviar a aprobacion' : 'Guardar valor'}</Button></DialogFooter>
  </form></DialogContent></Dialog>
}
