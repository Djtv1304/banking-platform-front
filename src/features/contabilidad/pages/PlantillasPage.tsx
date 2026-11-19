import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { hasPermission, PERMISOS, useAuthStore, usePuedeFuncion, usePermisos } from '@/features/auth'
import { consultarPlantilla, crearVersion, listarPlantillas, opcionesLinea, prepararLineas, simularPlantilla, type LineaPlantilla } from '@/features/contabilidad/api/plantillas.api'
import { Aviso, Button, Cargando, ErrorApi, Input } from '@/shared/ui'

const selectClass = 'block w-full rounded-lg border border-border bg-field p-2'
const clave = ['contabilidad', 'plantillas'] as const

export function PlantillasPage() {
  const permisos = usePermisos()
  const puedeEditar = hasPermission(permisos, PERMISOS.plantillasEditar)
  const roles = useAuthStore(state => state.user?.roles ?? [])
  const puedeVerPlan = usePuedeFuncion(
    'contabilidad.cuentas.consultar',
    roles.some(rol => ['ADMIN', 'CONTADOR', 'AUDITOR'].includes(rol)),
  )
  const [tipo, setTipo] = useState(0)
  const [id, setId] = useState(0)
  const lista = useQuery({ queryKey: [...clave, 'tipo', tipo], queryFn: ({ signal }) => listarPlantillas(tipo, signal), enabled: tipo > 0, retry: false })
  const detalle = useQuery({ queryKey: [...clave, 'detalle', id], queryFn: ({ signal }) => consultarPlantilla(id, signal), enabled: id > 0, retry: false })

  function consultar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const nuevoTipo = Number(new FormData(e.currentTarget).get('tipo'))
    if (nuevoTipo === tipo) void lista.refetch()
    else { setTipo(nuevoTipo); setId(0) }
  }

  return <main className="mx-auto flex w-full max-w-6xl flex-col gap-6">
    <header><h1 className="text-[40px] font-bold tracking-tight text-heading">Plantillas contables</h1></header>
    <section className="space-y-4 rounded-3xl border border-border bg-card p-6">
      <form className="flex flex-wrap items-end gap-3" onSubmit={consultar}>
        <label>ID del tipo de asiento<Input name="tipo" required type="number" min={1} max={2147483647} /></label>
        <Button type="submit" disabled={lista.isFetching}>Consultar versiones</Button>
      </form>
      {lista.isFetching && <Cargando texto="Consultando versiones…" />}
      {lista.isError && <ErrorApi error={lista.error} />}
      {lista.data?.length === 0 && <Aviso>El tipo de asiento no tiene una plantilla base.</Aviso>}
      {Boolean(lista.data?.length) && <label className="block">Versión
        <select className={selectClass} value={id} onChange={e => setId(Number(e.target.value))}>
          <option value={0}>Selecciona una versión</option>
          {lista.data?.map(p => <option key={p.IdPlantillaAsiento} value={p.IdPlantillaAsiento}>{p.CodigoPlantilla} · v{p.Version} · {p.Nombre}</option>)}
        </select>
      </label>}
      {detalle.isFetching && <Cargando texto="Consultando detalle…" />}
      {detalle.isError && <ErrorApi error={detalle.error} reintentar={() => void detalle.refetch()} />}
      {detalle.data && (
        <DetallePlantilla
          key={id}
          tipo={tipo}
          plantilla={detalle.data}
          seleccionar={setId}
          puedeEditar={puedeEditar}
          puedeVerPlan={puedeVerPlan}
        />
      )}
    </section>
  </main>
}

interface DetallePlantillaProps {
  tipo: number
  plantilla: Awaited<ReturnType<typeof consultarPlantilla>>
  seleccionar: (id: number) => void
  puedeEditar: boolean
  puedeVerPlan: boolean
}

export function DetallePlantilla({ tipo, plantilla, seleccionar, puedeEditar, puedeVerPlan }: DetallePlantillaProps) {
  const cliente = useQueryClient()
  const [editando, setEditando] = useState(false)
  const [lineas, setLineas] = useState(() => prepararLineas(plantilla))
  const version = useMutation({
    mutationFn: (datos: Parameters<typeof crearVersion>[1]) => crearVersion(tipo, datos),
    onSuccess: () => cliente.invalidateQueries({ queryKey: [...clave, 'tipo', tipo] }),
  })
  const simulacion = useMutation({ mutationFn: simularPlantilla })
  const bases = [...new Set(lineas.map(linea => linea.base))]
  const rolesProducto = [...new Set(lineas.filter(l => l.origen === 'PRODUCTO' && l.rol).map(l => l.rol!))]
  const rolesContra = [...new Set(lineas.filter(l => l.origen === 'CONTRAPRODUCTO' && l.rol).map(l => l.rol!))]

  function cambiar(indice: number, cambios: Partial<LineaPlantilla>) {
    simulacion.reset()
    setLineas(actuales => actuales.map((linea, i) => i === indice ? { ...linea, ...cambios } : linea))
  }

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!puedeEditar) return
    const datos = new FormData(e.currentTarget)
    const accion = (e.nativeEvent as SubmitEvent).submitter?.getAttribute('value')
    if (accion === 'guardar') {
      version.mutate({ codigoPlantilla: plantilla.CodigoPlantilla, nombre: String(datos.get('nombre')), vigenciaDesde: String(datos.get('vigenciaDesde')), lineas })
      return
    }
    const cuentas = (roles: string[], prefijo: string) => Object.fromEntries(roles.map(rol => [rol, Number(datos.get(`${prefijo}-${rol}`))]))
    simulacion.mutate({ lineas, montos: Object.fromEntries(bases.map(base => [base, String(datos.get(base) || '0')])),
      producto: cuentas(rolesProducto, 'producto'), contraproducto: cuentas(rolesContra, 'contra'),
      comision: Number(datos.get('comision')) || null })
  }

  return <div className="space-y-4 border-t border-border pt-4">
    <h2 className="text-lg font-semibold">{plantilla.Nombre} · versión {plantilla.Version}</h2>
    <p>Inicio de vigencia {plantilla.VigenciaDesde}{plantilla.VigenciaHasta && ` · Fin ${plantilla.VigenciaHasta}`} · {plantilla.Estado ? 'Aprobada' : 'Pendiente'}</p>
    {(!editando || !puedeEditar) && <>
      {!puedeEditar && (
        <p className="text-muted-foreground">Acceso de solo consulta. Puedes revisar las versiones y sus líneas.</p>
      )}
      <ol className="list-decimal space-y-1 pl-6">
        {prepararLineas(plantilla).map((linea, i) => (
          <li key={i}>{linea.lado} · {linea.base} · {linea.origen} {linea.cuenta ?? linea.rol}</li>
        ))}
      </ol>
      {puedeEditar && (
        <Button type="button" onClick={() => setEditando(true)}>Preparar nueva versión</Button>
      )}
    </>}
    {editando && puedeEditar && <form className="space-y-4" onSubmit={enviar}>
      <fieldset className="space-y-4" disabled={version.isPending || simulacion.isPending}>
        <legend className="font-semibold">Líneas de la nueva versión</legend>
        {lineas.map((linea, i) => <fieldset key={i} className="grid items-end gap-2 rounded-lg border border-border p-3 md:grid-cols-5">
          <legend>Línea {i + 1}</legend>
          <label>Movimiento<select className={selectClass} value={linea.lado} onChange={e => cambiar(i, { lado: e.target.value as LineaPlantilla['lado'] })}>{opcionesLinea.lado.map(o => <option key={o}>{o}</option>)}</select></label>
          <label>Origen<select className={selectClass} value={linea.origen} onChange={e => cambiar(i, { origen: e.target.value as LineaPlantilla['origen'], cuenta: null, rol: null })}>{opcionesLinea.origen.map(o => <option key={o}>{o}</option>)}</select></label>
          <label>Base<select className={selectClass} value={linea.base} onChange={e => cambiar(i, { base: e.target.value as LineaPlantilla['base'] })}>{opcionesLinea.base.map(o => <option key={o}>{o}</option>)}</select></label>
          {linea.origen === 'FIJA' && <label>ID de cuenta<Input type="number" min={1} required value={linea.cuenta ?? ''} onChange={e => cambiar(i, { cuenta: Number(e.target.value) || null })} /></label>}
          {(linea.origen === 'PRODUCTO' || linea.origen === 'CONTRAPRODUCTO') && <label>Rol contable<Input required maxLength={30} value={linea.rol ?? ''} onChange={e => cambiar(i, { rol: e.target.value || null })} /></label>}
          <Button type="button" variant="outline" disabled={lineas.length <= 2} onClick={() => { simulacion.reset(); setLineas(lineas.filter((_, orden) => orden !== i)) }}>Quitar línea</Button>
        </fieldset>)}
        <Button type="button" variant="outline" disabled={lineas.length >= 100} onClick={() => { simulacion.reset(); setLineas([...lineas, { lado: 'DEBITO', origen: 'FIJA', base: 'PRINCIPAL', cuenta: null, rol: null }]) }}>Añadir línea</Button>
        <div className="grid gap-3 md:grid-cols-2">
          <label>Nombre<Input name="nombre" maxLength={100} defaultValue={plantilla.Nombre} /></label>
          <label>Inicio de vigencia<Input name="vigenciaDesde" type="date" /></label>
        </div>
        <Button type="submit" value="guardar" disabled={version.isSuccess}>Crear versión pendiente</Button>
        <fieldset className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-2">
          <legend>Datos para simular</legend>
          {bases.map(base => <label key={base}>{base}<Input name={base} type="number" min={0} step="any" defaultValue="0" /></label>)}
          {rolesProducto.map(rol => <label key={rol}>Cuenta del producto · {rol}<Input name={`producto-${rol}`} type="number" min={1} /></label>)}
          {rolesContra.map(rol => <label key={rol}>Cuenta del contraproducto · {rol}<Input name={`contra-${rol}`} type="number" min={1} /></label>)}
          {lineas.some(l => l.origen === 'COMISION') && <label>Cuenta de comisión<Input name="comision" type="number" min={1} /></label>}
          <Button type="submit" variant="outline" value="simular">Simular</Button>
        </fieldset>
      </fieldset>
      {version.isError && <ErrorApi error={version.error} />}
      {version.data && <Aviso>Versión pendiente registrada. <Button type="button" variant="outline" onClick={() => seleccionar(version.data.idPlantillaAsiento)}>Ver versión</Button></Aviso>}
      {simulacion.isError && <ErrorApi error={simulacion.error} />}
      {simulacion.data && <Aviso><p>Total de débitos: {simulacion.data.total}</p><ul>{simulacion.data.lineas.map((l, i) => <li key={i}>{l.lado} · Cuenta {l.cuenta} · {l.monto}</li>)}</ul></Aviso>}
    </form>}
    {puedeVerPlan && <Link className="text-primary underline" to="/contabilidad">Plan de cuentas</Link>}
  </div>
}
