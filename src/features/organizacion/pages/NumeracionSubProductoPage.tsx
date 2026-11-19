import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore, usePuedeFuncion } from '@/features/auth'
import { ApiError, toApiError } from '@/shared/api'
import { Aviso, AvisoRequiereAprobacion, Button, Cargando, Input } from '@/shared/ui'
import { obtenerFicha } from '@/features/organizacion/api/productos.api'
import { obtenerNumeracion, previsualizarNumeracion, solicitarNumeracion } from '@/features/organizacion/api/numeracion.api'
import { ALGORITMOS, reglaNumeracionSchema, type Numeracion, type ReglaNumeracion } from '@/features/organizacion/api/numeracion.contract'
import { LineaVigencias } from '@/features/organizacion/components/LineaVigencias'
import { PestanasSubProducto } from '@/features/organizacion/components/PestanasSubProducto'

function Formulario({ id, actual, ocupado, enviar }: { id: number; actual: Numeracion['regla']; ocupado: boolean; enviar: (regla: ReglaNumeracion) => void }) {
  const [datos, setDatos] = useState({ prefijo: actual?.prefijo ?? '', incluyeAgencia: actual?.incluyeAgencia ?? false, longitudSecuencia: String(actual?.longitudSecuencia ?? 8), algoritmoVerificador: actual?.algoritmoVerificador ?? 'NINGUNO' })
  const [consultada, setConsultada] = useState(datos)
  useEffect(() => { const t = setTimeout(() => setConsultada(datos), 400); return () => clearTimeout(t) }, [datos])
  const regla = reglaNumeracionSchema.safeParse({ ...consultada, longitudSecuencia: Number(consultada.longitudSecuencia) })
  const previa = useQuery({ queryKey: ['productos', 'numeracion', 'ejemplo', id, consultada], queryFn: ({ signal }) => previsualizarNumeracion(id, reglaNumeracionSchema.parse({ ...consultada, longitudSecuencia: Number(consultada.longitudSecuencia) }), signal), enabled: regla.success, retry: false })
  const esperando = JSON.stringify(consultada) !== JSON.stringify(datos)
  const cambiar = (campo: keyof typeof datos, valor: string | boolean) => setDatos(v => ({ ...v, [campo]: valor }))
  const submit = (e: FormEvent) => { e.preventDefault(); const r = reglaNumeracionSchema.safeParse({ ...datos, longitudSecuencia: Number(datos.longitudSecuencia) }); if (r.success && !esperando && previa.data?.estadoSecuencia === 'DISPONIBLE') enviar(r.data) }
  return <form className="space-y-5" onSubmit={submit}><fieldset disabled={ocupado} className="grid gap-4 sm:grid-cols-2"><label className="space-y-1 text-sm">Prefijo<Input value={datos.prefijo} maxLength={6} inputMode="numeric" autoComplete="off" onChange={e => cambiar('prefijo', e.target.value)} required /></label><label className="space-y-1 text-sm">Digitos de la secuencia<Input type="number" min={6} max={10} step={1} value={datos.longitudSecuencia} onChange={e => cambiar('longitudSecuencia', e.target.value)} required /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={datos.incluyeAgencia} onChange={e => cambiar('incluyeAgencia', e.target.checked)} />Incluir codigo de agencia</label><label className="space-y-1 text-sm">Digito verificador<select className="h-10 w-full rounded-lg border border-border bg-background px-3" value={datos.algoritmoVerificador} onChange={e => cambiar('algoritmoVerificador', e.target.value)}>{Object.entries(ALGORITMOS).map(([v, nombre]) => <option key={v} value={v}>{nombre}</option>)}</select></label></fieldset>
    <section className="rounded-xl bg-muted/40 p-4" aria-label="Ejemplo de numeracion"><h3 className="font-semibold">Ejemplo de numero de cuenta</h3>{!regla.success ? <p className="mt-2 text-sm text-muted-foreground">{datos.prefijo ? regla.error.issues[0]?.message : 'Ingrese un prefijo para ver el ejemplo.'}</p> : esperando || previa.isFetching ? <p className="mt-2 text-sm">Actualizando ejemplo...</p> : previa.isError ? <Aviso tono="error">{toApiError(previa.error).message}</Aviso> : previa.data?.ejemplo ? <p className="mt-2 break-all font-mono text-2xl font-semibold tabular-nums">{previa.data.ejemplo}</p> : <p className="mt-2 text-sm">{previa.data?.estadoSecuencia === 'AGOTADA' ? 'La secuencia esta agotada. Seleccione otro formato.' : 'No hay una agencia disponible para mostrar el ejemplo.'}</p>}<p className="mt-2 text-xs text-muted-foreground">El ejemplo no reserva un numero. La regla requiere aprobacion.</p>{datos.incluyeAgencia && previa.data?.agenciaEjemplo && <p className="mt-1 text-xs text-muted-foreground">Codigo de agencia del ejemplo: {previa.data.agenciaEjemplo}</p>}</section>
    <Button type="submit" disabled={ocupado || esperando || !regla.success || previa.isFetching || previa.isError || previa.data?.estadoSecuencia !== 'DISPONIBLE'}>{ocupado ? 'Enviando solicitud...' : 'Solicitar aprobacion'}</Button>
  </form>
}

export function NumeracionSubProductoPage() {
  const { idSubProducto = '' } = useParams(), id = Number(idSubProducto)
  const valido = Number.isSafeInteger(id) && id > 0
  const usuario = useAuthStore(s => s.user)
  const permiso = Boolean(usuario?.roles.includes('ADMIN') && usuario.permisos.includes('prd-numeracion'))
  const puedeEditar = usePuedeFuncion('productos.numeracion', permiso) && permiso
  const cliente = useQueryClient()
  const ficha = useQuery({ queryKey: ['productos', 'ficha', id], queryFn: () => obtenerFicha(id), enabled: valido })
  const numeracion = useQuery({ queryKey: ['productos', 'numeracion', id], queryFn: ({ signal }) => obtenerNumeracion(id, signal), enabled: valido && ficha.data?.producto.tipoProducto === 'Cuenta' })
  const solicitud = useMutation({ mutationFn: (regla: ReglaNumeracion) => solicitarNumeracion(id, regla), onSuccess: r => { cliente.setQueryData<Numeracion>(['productos', 'numeracion', id], anterior => anterior ? { ...anterior, solicitudPendiente: r.idSolicitud } : anterior); void cliente.invalidateQueries({ queryKey: ['productos', 'numeracion', id] }); void cliente.invalidateQueries({ queryKey: ['aprobaciones'] }) }, onError: error => { if (error instanceof ApiError && error.code === 'REGLA_EN_USO') void cliente.invalidateQueries({ queryKey: ['productos', 'numeracion', id] }) } })
  if (!valido) return <Aviso tono="error">El identificador del subproducto no es valido.</Aviso>
  if (ficha.isPending) return <Cargando texto="Cargando subproducto..." />
  if (ficha.isError) return <Aviso tono="error">{toApiError(ficha.error).message}</Aviso>
  if (ficha.data.producto.tipoProducto !== 'Cuenta') return <Aviso>La numeracion corresponde a subproductos de cuenta.</Aviso>
  if (numeracion.isPending) return <Cargando texto="Cargando numeracion..." />
  if (numeracion.isError) return <Aviso tono="error">{toApiError(numeracion.error).message}</Aviso>
  const actual = numeracion.data, regla = actual.regla
  const puede = puedeEditar && ficha.data.subproducto.estadoCatalogo !== 'Retirado'
  return <div className="mx-auto flex min-w-0 w-full max-w-6xl flex-col gap-6"><Link className="text-primary underline" to={`/productos/${ficha.data.producto.idProducto}`}>Volver al producto</Link><header><p className="text-sm text-muted-foreground">{ficha.data.producto.nombreProducto}</p><h1 className="text-3xl font-bold text-heading">{ficha.data.subproducto.nombreSubProducto}</h1></header><PestanasSubProducto id={id} tipo="Cuenta" activa="numeracion" />
    {actual.usada && <Aviso>Esta regla ya se utilizo para abrir cuentas y no se puede cambiar.</Aviso>}{!puede && <Aviso>Solo tiene permisos de lectura.</Aviso>}{actual.solicitudPendiente && <AvisoRequiereAprobacion idSolicitud={actual.solicitudPendiente} />}{solicitud.isError && <Aviso tono="error">{toApiError(solicitud.error).message}</Aviso>}
    <section className="min-w-0 rounded-3xl border border-border bg-card p-4 sm:p-6"><h2 className="mb-4 text-xl font-semibold">Regla aprobada</h2>{regla ? <LineaVigencias dobleColumna eventos={[{ id: regla.idReglaNumeracion, titulo: 'Formato del numero de cuenta', desde: regla.vigenciaDesde, hasta: regla.vigenciaHasta, estado: actual.usada ? 'En uso' : 'Disponible', responsable: regla.responsable, valores: { Prefijo: regla.prefijo, 'Incluir codigo de agencia': regla.incluyeAgencia ? 'Si' : 'No', 'Digitos de secuencia': String(regla.longitudSecuencia), 'Digito verificador': ALGORITMOS[regla.algoritmoVerificador], 'Ejemplo de numero': actual.ejemplo ?? (actual.estadoSecuencia === 'AGOTADA' ? 'Secuencia agotada' : 'No disponible') } }]} /> : <p className="text-sm text-muted-foreground">Este modelo todavia no tiene una regla aprobada.</p>}</section>
    {puede && !actual.usada && !actual.solicitudPendiente && <section className="min-w-0 rounded-3xl border border-border bg-card p-4 sm:p-6"><h2 className="mb-4 text-xl font-semibold">{regla ? 'Solicitar cambio de regla' : 'Definir numeracion'}</h2><Formulario key={regla?.idReglaNumeracion ?? 'nueva'} id={id} actual={regla} ocupado={solicitud.isPending} enviar={r => solicitud.mutate(r)} /></section>}
  </div>
}
