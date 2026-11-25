import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'

import { hasPermission, PERMISOS, useAuthStore, usePermisos } from '@/features/auth'
import {
  consultarCatalogosPlantillas, consultarPlantilla, consultarSolicitudPlantilla, listarPlantillas,
  type PlantillaDetallada,
} from '@/features/contabilidad/api/plantillas.api'
import { consultarReglasContables, type ReglaBoveda, type ReglaContable, type ReglaVersionada } from '@/features/contabilidad/api/reglas-contables.api'
import { EditarVersionPlantilla } from '@/features/contabilidad/components/EditarVersionPlantilla'
import { ErrorPlantilla } from '@/features/contabilidad/components/ErrorPlantilla'
import { useFechaContableActual } from '@/features/contabilidad/hooks/useFechaContable'
import { claseSelectorPlantilla, etiquetaPlantilla } from '@/features/contabilidad/lib/plantillas'
import { Aviso, Badge, Button, Cargando, Input } from '@/shared/ui'

const clave = ['contabilidad', 'plantillas'] as const
const claseTabla = 'w-full text-left text-sm [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-2.5'
const claseFila = 'border-t border-border'
const compararEtiquetas = new Intl.Collator('es', { numeric: true }).compare
type Catalogos = Awaited<ReturnType<typeof consultarCatalogosPlantillas>>
type Filtros = { q?: string; codigo?: string; estado?: string; origen?: string; tipo?: string; fecha?: string; agencia?: string }
type Seleccion = { fuente: 'PLANTILLA_ASIENTO'; id: number } | { fuente: 'PLANTILLA_BOVEDA'; id: string }

const integraciones = { CONECTADA: 'Conectada', PENDIENTE: 'Pendiente', SIN_VERIFICAR: 'Sin verificar' }
const nombreRegla = (regla: ReglaContable) => regla.fuente === 'PLANTILLA_ASIENTO'
  ? regla.Nombre : etiquetaPlantilla(regla.TipoMovimiento)
const codigoRegla = (regla: ReglaContable) => regla.fuente === 'PLANTILLA_ASIENTO'
  ? regla.CodigoPlantilla : regla.TipoMovimiento
const alcance = (regla: ReglaContable) => regla.IdAgencia === null ? 'General' : `Agencia ${regla.IdAgencia}`
const fuenteRegla = (regla: ReglaContable) => regla.fuente === 'PLANTILLA_BOVEDA' ? 'Matriz de Bóveda' : 'Plantilla versionada'
const estadosTipo: Record<string, string> = { A: 'Activo', I: 'Inactivo' }
const vigencia = (regla: ReglaContable) => regla.fuente === 'PLANTILLA_BOVEDA' ? 'No aplica'
  : regla.vigente === null ? 'Sin fecha de evaluación' : regla.vigente ? 'Vigente' : 'No seleccionada'
const uso = (regla: ReglaContable) => regla.fuente === 'PLANTILLA_BOVEDA' ? 'No disponible' : regla.Usada ? 'Usada' : 'Sin uso registrado'
const estado = (regla: ReglaContable) => regla.fuente === 'PLANTILLA_BOVEDA'
  ? regla.Habilitada ? 'Habilitada' : 'No habilitada'
  : regla.Estado ? 'Activa' : 'Inactiva'

function aplicarFiltros(regla: ReglaContable, filtros: Filtros) {
  const codigo = codigoRegla(regla).toLowerCase()
  const busqueda = filtros.q?.toLowerCase()
  const activa = regla.fuente === 'PLANTILLA_ASIENTO' ? regla.Estado : regla.Habilitada
  return (!busqueda || codigo.includes(busqueda) || nombreRegla(regla).toLowerCase().includes(busqueda))
    && (!filtros.codigo || codigo === filtros.codigo.toLowerCase())
    && (!filtros.estado || activa === (filtros.estado === '1'))
    && (!filtros.origen || regla.Origen === filtros.origen)
    && (!filtros.tipo || regla.CodigoTipoAsiento === filtros.tipo)
}

function DatosRegla({ regla }: { regla: ReglaContable }) {
  const campos = {
    'Módulo contable': etiquetaPlantilla(regla.Origen), Desde: regla.desde ?? 'Sin identificar', Hacia: regla.hacia ?? 'Sin identificar',
    Alcance: alcance(regla), Fuente: fuenteRegla(regla), Estado: estado(regla), Configuración: 'Configurada', Vigencia: vigencia(regla),
    Integración: integraciones[regla.integracion], 'Evidencia de uso': uso(regla), Consumidor: regla.consumidor ?? 'Sin identificar',
  }
  return <dl className="grid gap-3 rounded-xl bg-field p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
    {Object.entries(campos).map(([etiqueta, valor]) => <div key={etiqueta}>
      <dt className="text-muted-foreground">{etiqueta}</dt><dd className="font-medium">{valor}</dd>
    </div>)}
  </dl>
}

function TablaDesplazable({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  const region = useRef<HTMLDivElement>(null)
  const id = useId()

  function desplazar(direccion: number) {
    const tabla = region.current
    tabla?.scrollBy({ left: tabla.clientWidth * direccion })
  }

  return <div className="relative min-w-0">
    <Button type="button" variant="outline" size="sm" aria-controls={id}
      className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-10" onClick={() => desplazar(-1)}>
      Desplazar tabla a la izquierda
    </Button>
    <Button type="button" variant="outline" size="sm" aria-controls={id}
      className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-10" onClick={() => desplazar(1)}>
      Desplazar tabla a la derecha
    </Button>
    <div ref={region} id={id} className="overflow-x-auto rounded-xl border border-border" role="region" aria-label={etiqueta}>
      {children}
    </div>
  </div>
}

export function PlantillasPage() {
  const permisos = usePermisos()
  const esContador = useAuthStore(s => s.user?.roles.some(rol => rol.trim().toUpperCase() === 'CONTADOR') ?? false)
  const puedeEditar = hasPermission(permisos, PERMISOS.plantillasEditar) && esContador
  const cliente = useQueryClient()
  const [filtros, setFiltros] = useState<Filtros>({})
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null)
  const id = seleccion?.fuente === 'PLANTILLA_ASIENTO' ? seleccion.id : null
  const agenciaSesion = useAuthStore(s => s.user?.idAgencia)
  const [mensaje, setMensaje] = useState('')
  const catalogos = useQuery({ queryKey: [...clave, 'catalogos'], queryFn: ({ signal }) => consultarCatalogosPlantillas(signal), retry: false })
  const fecha = useFechaContableActual().data?.fecha
  const evaluacion = { fecha: filtros.fecha, agencia: filtros.agencia }
  const lista = useQuery({
    queryKey: [...clave, 'reglas', agenciaSesion, evaluacion],
    queryFn: ({ signal }) => consultarReglasContables(evaluacion, signal), retry: false,
  })
  const reglas = lista.data?.reglas ?? []
  const reglaBoveda = seleccion?.fuente === 'PLANTILLA_BOVEDA'
    ? reglas.find(regla => regla.fuente === 'PLANTILLA_BOVEDA' && regla.idRegla === seleccion.id)
    : undefined
  const resultados = lista.data?.reglas.filter(regla => aplicarFiltros(regla, filtros))
  const tiposPorCodigo = new Map(catalogos.data?.tiposAsiento.map(tipo => [tipo.Codigo, tipo.Nombre]))
  const nombreTipo = (codigo: string) => tiposPorCodigo.get(codigo) ?? codigo
  const modulos = [...new Set([...reglas.map(regla => regla.Origen), ...(filtros.origen ? [filtros.origen] : [])])]
    .sort((a, b) => compararEtiquetas(etiquetaPlantilla(a), etiquetaPlantilla(b)))
  const tipos = [...new Set([...reglas.flatMap(regla => regla.CodigoTipoAsiento ?? []), ...(filtros.tipo ? [filtros.tipo] : [])])]
    .sort((a, b) => compararEtiquetas(nombreTipo(a), nombreTipo(b)) || compararEtiquetas(a, b))
  const conceptosPorCodigo = new Map(catalogos.data?.conceptosContables.map(concepto => [concepto.CodigoConcepto, concepto.ConceptoDetalle]))
  const versiones = new Map(reglas.flatMap(regla => regla.fuente === 'PLANTILLA_ASIENTO' ? [[regla.IdPlantillaAsiento, regla] as const] : []))
  const detalle = useQuery({
    queryKey: [...clave, 'detalle', id], queryFn: ({ signal }) => consultarPlantilla(id!, signal), enabled: id !== null, retry: false, staleTime: 0,
  })

  function buscar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const datos = new FormData(evento.currentTarget)
    const texto = (campo: string) => String(datos.get(campo) ?? '').trim() || undefined
    setFiltros({
      q: texto('q'), codigo: texto('codigo'), estado: texto('estado'), origen: texto('origen'),
      tipo: texto('tipo'), fecha: texto('fecha'), agencia: texto('agencia'),
    })
    setMensaje('')
  }

  function setId(idPlantilla: number) {
    setSeleccion({ fuente: 'PLANTILLA_ASIENTO', id: idPlantilla })
  }

  function guardar(nuevaId: number) {
    setId(nuevaId)
    setMensaje('La nueva versión se registró y se envió a aprobación.')
    void cliente.invalidateQueries({ queryKey: clave })
  }

  return <div className="mx-auto grid w-full max-w-7xl gap-6">
    <header>
      <h1 className="text-3xl font-bold tracking-tight text-heading sm:text-[40px]">Plantillas contables</h1>
      <p className="mt-2 text-muted-foreground">Consulta las reglas que generan movimientos contables y revisa sus versiones y solicitudes de aprobación.</p>
    </header>
    {mensaje && <Aviso>{mensaje}</Aviso>}
    {seleccion === null ? <section className="grid min-w-0 gap-5 rounded-3xl border border-border bg-card p-4 sm:p-6" aria-label="Listado de plantillas">
      <form onSubmit={buscar} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label>Buscar por nombre o código<Input type="search" name="q" defaultValue={filtros.q} maxLength={100} /></label>
        <label>Código exacto<Input name="codigo" defaultValue={filtros.codigo} maxLength={50} /></label>
        <div><label htmlFor="plantillas-estado">Estado</label><select id="plantillas-estado" name="estado" className={claseSelectorPlantilla} defaultValue={filtros.estado ?? ''}>
          <option value="">Todos</option><option value="1">Activas o habilitadas</option><option value="0">Inactivas o no habilitadas</option>
        </select></div>
        <div><label htmlFor="plantillas-origen">Módulo contable</label><select id="plantillas-origen" name="origen" className={claseSelectorPlantilla} defaultValue={filtros.origen ?? ''}>
          <option value="">Todos</option>{modulos.map(origen => <option key={origen} value={origen}>{etiquetaPlantilla(origen)}</option>)}
        </select></div>
        <div><label htmlFor="plantillas-tipo">Tipo de asiento</label><select id="plantillas-tipo" name="tipo" className={claseSelectorPlantilla} defaultValue={filtros.tipo ?? ''}>
          <option value="">Todos</option>{tipos.map(tipo => <option key={tipo} value={tipo}>{nombreTipo(tipo)}</option>)}
        </select></div>
        <label>Fecha de evaluación<Input type="date" name="fecha" defaultValue={filtros.fecha} /></label>
        <label>Agencia de Bóveda<Input name="agencia" inputMode="numeric" pattern="[0-9]{3}" title="Código de agencia de tres dígitos" maxLength={3} defaultValue={filtros.agencia} /></label>
        <Button type="submit">Buscar</Button>
      </form>
      {catalogos.isError && <ErrorPlantilla error={catalogos.error} reintentar={() => void catalogos.refetch()} />}
      {lista.isPending && <Cargando texto="Cargando plantillas…" />}
      {lista.isError && <ErrorPlantilla error={lista.error} reintentar={() => void lista.refetch()} />}
      {lista.data && <p className="text-sm text-muted-foreground">Fecha de evaluación: {lista.data.fechaContable ?? 'No disponible'}</p>}
      {lista.data?.matrizBovedaDisponible === false && <Aviso>La matriz de Bóveda no está disponible para este alcance.</Aviso>}
      {reglas.some(regla => regla.fuente === 'PLANTILLA_BOVEDA' && regla.TipoMovimiento === 'Traslado') &&
        <p className="text-sm text-muted-foreground">En un traslado de Bóveda, el motor usa plantillas versionadas cuando ambas etapas tienen una versión seleccionada en la misma fecha contable. Durante el corte parcial, ambas etapas usan la matriz.</p>}
      {resultados?.length === 0 && <Aviso>No encontramos plantillas para los filtros seleccionados.</Aviso>}
      {Boolean(resultados?.length) && <TablaDesplazable etiqueta="Resultados de plantillas">
        <table className={claseTabla}>
          <thead className="bg-field"><tr>{['Nombre', 'Código', 'Concepto', 'Módulo contable', 'Tipo de asiento', 'Desde', 'Hacia', 'Alcance', 'Estado', 'Configuración', 'Vigencia', 'Integración', 'Evidencia de uso', 'Versión', 'Acción'].map(col => <th key={col} scope="col">{col}</th>)}</tr></thead>
          <tbody>{resultados?.map(p => <tr key={p.idRegla} className={claseFila}>
            <th scope="row" className="min-w-36 font-medium text-heading">
              {nombreRegla(p)}{p.fuente === 'PLANTILLA_BOVEDA' && ` · ${p.Naturaleza === 'I' ? 'Ingreso' : 'Egreso'}`}
              {p.IdAgencia !== null && <span className="block text-xs text-muted-foreground">{fuenteRegla(p)}</span>}
            </th>
            <td>{codigoRegla(p)}</td><td>{p.fuente === 'PLANTILLA_ASIENTO' && p.CodigoConcepto ? conceptosPorCodigo.get(p.CodigoConcepto) ?? p.CodigoConcepto : '—'}</td>
            <td>{etiquetaPlantilla(p.Origen)}</td><td>{p.CodigoTipoAsiento ? nombreTipo(p.CodigoTipoAsiento) : '—'}</td>
            <td>{p.desde ?? '—'}</td><td>{p.hacia ?? '—'}</td><td>{alcance(p)}</td><td>{estado(p)}</td>
            <td>Configurada</td><td><Badge variant="outline">{vigencia(p)}</Badge></td><td>{integraciones[p.integracion]}</td><td>{uso(p)}</td><td>{p.Version ?? '—'}</td>
            <td><Button variant="outline" size="sm" onClick={() => p.fuente === 'PLANTILLA_ASIENTO' ? setId(p.IdPlantillaAsiento) : setSeleccion({ fuente: p.fuente, id: p.idRegla })}
              aria-label={p.fuente === 'PLANTILLA_ASIENTO' ? `Ver ${p.Nombre}, versión ${p.Version}` : `Ver Bóveda, ${p.TipoMovimiento}, ${p.Naturaleza === 'I' ? 'ingreso' : 'egreso'}, agencia ${p.IdAgencia}`}>Ver detalle</Button></td>
          </tr>)}</tbody>
        </table>
      </TablaDesplazable>}
    </section> : <>
      <Button variant="ghost" className="w-fit" onClick={() => { setSeleccion(null); setMensaje('') }}>Volver al listado</Button>
      {seleccion.fuente === 'PLANTILLA_BOVEDA' ? <>
        {lista.isPending && <Cargando texto="Cargando detalle…" />}
        {lista.isError && <ErrorPlantilla error={lista.error} reintentar={() => void lista.refetch()} />}
        {reglaBoveda?.fuente === 'PLANTILLA_BOVEDA' && <DetalleBoveda regla={reglaBoveda} />}
        {lista.isSuccess && !reglaBoveda && <Aviso>La regla de Bóveda no está disponible para este alcance.</Aviso>}
      </> : <>
        {detalle.isPending && <Cargando texto="Cargando detalle…" />}
        {detalle.isError && <ErrorPlantilla error={detalle.error} reintentar={() => void detalle.refetch()} />}
        {detalle.data && <DetallePlantilla key={id} plantilla={detalle.data} seleccionar={setId} alGuardar={guardar} puedeEditar={puedeEditar} fecha={fecha} catalogos={catalogos.data} versiones={versiones} />}
      </>}
    </>}
  </div>
}

function DetalleBoveda({ regla }: { regla: ReglaBoveda }) {
  const titulo = useRef<HTMLHeadingElement>(null)
  useEffect(() => { titulo.current?.focus() }, [])
  return <section className="grid min-w-0 gap-5 rounded-3xl border border-border bg-card p-4 sm:p-6">
    <header>
      <h2 ref={titulo} tabIndex={-1} className="text-2xl font-semibold text-heading">{nombreRegla(regla)}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{regla.Naturaleza === 'I' ? 'Ingreso' : 'Egreso'} · {alcance(regla)}</p>
    </header>
    <DatosRegla regla={regla} />
    <dl className="grid gap-3 rounded-xl bg-field p-4 text-sm sm:grid-cols-2">
      <div><dt className="text-muted-foreground">Debe</dt><dd>{regla.Debe ?? 'Sin cuenta'}</dd></div>
      <div><dt className="text-muted-foreground">Haber</dt><dd>{regla.Haber ?? 'Sin cuenta'}</dd></div>
      <div><dt className="text-muted-foreground">Tipo de asiento</dt><dd>{regla.CodigoTipoAsiento ?? 'Sin identificar'}</dd></div>
      <div><dt className="text-muted-foreground">Estado del tipo</dt><dd>{regla.EstadoTipo === null ? 'Sin identificar' : estadosTipo[regla.EstadoTipo] ?? regla.EstadoTipo}</dd></div>
      <div><dt className="text-muted-foreground">Operación</dt><dd>{regla.EsManual === null ? 'Sin identificar' : regla.EsManual ? 'Manual' : 'Automática'}</dd></div>
    </dl>
    <p className="text-sm text-muted-foreground">Regla de Bóveda de solo consulta.</p>
  </section>
}

interface DetallePlantillaProps {
  plantilla: PlantillaDetallada
  seleccionar: (id: number) => void
  alGuardar: (id: number) => void
  puedeEditar: boolean
  fecha?: string
  catalogos?: Catalogos
  versiones?: ReadonlyMap<number, ReglaVersionada>
}

export function DetallePlantilla({ plantilla, seleccionar, alGuardar, puedeEditar, fecha, catalogos, versiones }: DetallePlantillaProps) {
  const [editando, setEditando] = useState(false)
  const titulo = useRef<HTMLHeadingElement>(null)
  useEffect(() => { titulo.current?.focus() }, [])
  const id = plantilla.IdPlantillaAsiento
  const regla = versiones?.get(id)
  const solicitud = useQuery({ queryKey: [...clave, 'solicitud', id], queryFn: ({ signal }) => consultarSolicitudPlantilla(id, signal), retry: false, staleTime: 0 })
  const familia = { codigo: plantilla.CodigoPlantilla, idTipoAsiento: plantilla.IdTipoAsiento }
  const historial = useQuery({ queryKey: [...clave, 'historial', familia], queryFn: ({ signal }) => listarPlantillas(familia, signal), retry: false, staleTime: 0 })
  const gestion = solicitud.data && (solicitud.data.puedeAprobar || solicitud.data.puedeRechazar || solicitud.data.puedeCancelar)
  const concepto = catalogos?.conceptosContables.find(c => c.IdConceptoContable === plantilla.IdConceptoContable)?.ConceptoDetalle ?? plantilla.ConceptoDetalle
  const tipo = catalogos?.tiposAsiento.find(t => t.IdTipoAsiento === plantilla.IdTipoAsiento)?.Nombre ?? plantilla.NombreTipoAsiento
  const versionesAnteriores = historial.data?.filter(p => p.IdPlantillaAsiento !== id)

  return <section className="grid min-w-0 gap-5 rounded-3xl border border-border bg-card p-4 sm:p-6">
    <header>
      <div className="flex flex-wrap items-center gap-3">
        <h2 ref={titulo} tabIndex={-1} className="text-2xl font-semibold text-heading">{plantilla.Nombre}</h2>
        <Badge variant="outline">{plantilla.Estado ? 'Activa' : 'Inactiva'}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{plantilla.CodigoPlantilla} · Versión {plantilla.Version}</p>
    </header>
    <dl className="grid gap-3 rounded-xl bg-field p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <div><dt className="text-muted-foreground">Concepto contable</dt><dd className="font-medium">{concepto ?? 'Sin descripción'}</dd></div>
      <div><dt className="text-muted-foreground">Tipo de asiento</dt><dd className="font-medium">{tipo ?? 'Sin descripción'}</dd></div>
      {!regla && <div><dt className="text-muted-foreground">Módulo contable</dt><dd className="font-medium">{etiquetaPlantilla(plantilla.Origen)}</dd></div>}
      <div><dt className="text-muted-foreground">Intervalo de vigencia</dt><dd className="font-medium">Desde {plantilla.VigenciaDesde}{plantilla.VigenciaHasta && ` hasta ${plantilla.VigenciaHasta}`}</dd></div>
      {regla?.Prioridad != null && <div><dt className="text-muted-foreground">Prioridad</dt><dd className="font-medium">{regla.Prioridad}</dd></div>}
    </dl>
    {regla && <DatosRegla regla={regla} />}
    <div className="grid gap-3">
      <h3 className="text-lg font-semibold text-heading">Movimientos contables</h3>
      <TablaDesplazable etiqueta="Líneas contables de la versión">
        <table className={claseTabla}>
          <thead className="bg-field"><tr>{['Orden', 'Cuenta', 'Movimiento', 'Componente'].map(col => <th key={col} scope="col">{col}</th>)}</tr></thead>
          <tbody>{plantilla.lineas.map(linea => <tr key={linea.Orden} className={claseFila}>
            <td>{linea.Orden}</td>
            <td>{linea.OrigenCuenta === 'FIJA'
              ? [linea.CodigoCuenta, linea.NombreCuenta].filter(Boolean).join(' · ') || 'Cuenta fija no disponible'
              : `Cuenta dinámica de ${etiquetaPlantilla(linea.OrigenCuenta).toLowerCase()}${linea.CodigoRol ? ` · Rol ${linea.CodigoRol}` : ''}`}</td>
            <td>{etiquetaPlantilla(linea.TipoMovimiento)}</td><td>{etiquetaPlantilla(linea.ComponenteImporte)}</td>
          </tr>)}</tbody>
        </table>
      </TablaDesplazable>
    </div>

    <section className="grid gap-3 rounded-xl border border-border p-4" aria-label="Solicitud de aprobación">
      <h3 className="text-lg font-semibold text-heading">Solicitud de aprobación</h3>
      {solicitud.isPending && <Cargando texto="Consultando solicitud…" />}
      {solicitud.isError && <ErrorPlantilla error={solicitud.error} reintentar={() => void solicitud.refetch()} />}
      {solicitud.data === null && <p className="text-sm text-muted-foreground">No hay una solicitud visible para esta versión.</p>}
      {solicitud.data && <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline">{solicitud.data.estado}</Badge>
        <Button asChild variant="outline"><Link to={`/aprobaciones/${solicitud.data.idSolicitud}`}>{gestion ? 'Gestionar solicitud en Aprobaciones' : 'Ver historial de la solicitud'}</Link></Button>
      </div>}
    </section>

    {!puedeEditar && <p className="text-sm text-muted-foreground">Acceso de solo consulta. Puedes revisar las versiones y sus líneas.</p>}
    {puedeEditar && !editando && <Button className="w-fit" onClick={() => setEditando(true)}>Preparar nueva versión</Button>}
    {editando && puedeEditar && <EditarVersionPlantilla plantilla={plantilla} fecha={fecha} alGuardar={alGuardar} cerrar={() => setEditando(false)} />}

    <section className="grid gap-3" aria-label="Historial de versiones">
      <h3 className="text-lg font-semibold text-heading">Historial de versiones</h3>
      {historial.isPending && <Cargando texto="Cargando historial…" />}
      {historial.isError && <ErrorPlantilla error={historial.error} reintentar={() => void historial.refetch()} />}
      {versionesAnteriores?.length === 0 && <p className="text-sm text-muted-foreground">No hay otras versiones de esta familia.</p>}
      {Boolean(versionesAnteriores?.length) && <ul className="divide-y divide-border rounded-xl border border-border">
        {versionesAnteriores?.map(p => {
          const anterior = versiones?.get(p.IdPlantillaAsiento)
          return <li key={p.IdPlantillaAsiento} className="flex flex-wrap items-center justify-between gap-3 p-3">
            <span className="text-sm">Versión {p.Version} · {p.Nombre} · {p.Estado ? 'Activa' : 'Inactiva'}{anterior && ` · ${vigencia(anterior)}`}</span>
            <Button variant="outline" size="sm" onClick={() => seleccionar(p.IdPlantillaAsiento)} aria-label={`Ver versión ${p.Version}`}>Ver versión</Button>
          </li>
        })}
      </ul>}
    </section>
  </section>
}
