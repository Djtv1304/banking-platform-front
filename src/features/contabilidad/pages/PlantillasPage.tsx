import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router'

import { obtenerContextoAgencias } from '@/features/auth/api/auth.api'
import { useAgencias } from '@/features/catalogos'
import { hasPermission, PERMISOS, useAuthStore, usePermisos } from '@/features/auth'
import {
  consultarCatalogosPlantillas, consultarPlantilla, consultarSolicitudPlantilla, listarPlantillas,
  type PlantillaDetallada,
} from '@/features/contabilidad/api/plantillas.api'
import { consultarReglasContables, type ReglaBoveda, type ReglaContable, type ReglaVersionada } from '@/features/contabilidad/api/reglas-contables.api'
import { EditarVersionPlantilla } from '@/features/contabilidad/components/EditarVersionPlantilla'
import { ErrorPlantilla } from '@/features/contabilidad/components/ErrorPlantilla'
import { useFechaContableActual } from '@/features/contabilidad/hooks/useFechaContable'
import { etiquetaContable, etiquetaOrigenCuenta } from '@/features/contabilidad/lib/etiquetas'
import { claseSelectorPlantilla } from '@/features/contabilidad/lib/plantillas'
import { Aviso, Badge, Button, Cargando, Input } from '@/shared/ui'

const clave = ['contabilidad', 'plantillas'] as const
const claseTabla = 'w-full text-left text-sm [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-2.5'
const claseFila = 'border-t border-border'
const compararEtiquetas = new Intl.Collator('es', { numeric: true }).compare
type Catalogos = Awaited<ReturnType<typeof consultarCatalogosPlantillas>>
type Filtros = { q?: string; estado?: string; origen?: string; tipo?: string; fecha?: string; agencia?: string }

const integraciones = { CONECTADA: 'Conectada', PENDIENTE: 'Pendiente', SIN_VERIFICAR: 'Sin verificar' }
const nombreRegla = (regla: ReglaContable) => regla.fuente === 'PLANTILLA_ASIENTO'
  ? etiquetaContable(regla.CodigoPlantilla, regla.Nombre) : etiquetaContable(regla.TipoMovimiento)
const codigoRegla = (regla: ReglaContable) => regla.fuente === 'PLANTILLA_ASIENTO'
  ? regla.CodigoPlantilla : regla.TipoMovimiento
const alcance = (regla: ReglaContable) => regla.IdAgencia === null ? 'General' : `Agencia ${regla.IdAgencia}`
const fuenteRegla = (regla: ReglaContable) => regla.fuente === 'PLANTILLA_BOVEDA' ? 'Matriz de Bóveda' : 'Plantilla versionada'
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
    && (!filtros.estado || activa === (filtros.estado === '1'))
    && (!filtros.origen || regla.Origen === filtros.origen)
    && (!filtros.tipo || regla.CodigoTipoAsiento === filtros.tipo)
}

function DatosRegla({ regla }: { regla: ReglaContable }) {
  const campos = {
    'Módulo contable': etiquetaContable(regla.Origen),
    Desde: etiquetaContable(regla.desde, regla.desde),
    Hacia: etiquetaContable(regla.hacia, regla.hacia),
    Alcance: alcance(regla),
    Fuente: fuenteRegla(regla),
    'Disponibilidad operativa': disponibilidad(regla),
    Vigencia: vigencia(regla),
  }
  return <DatosDetalle campos={campos} />
}

function disponibilidad(regla: ReglaContable) {
  if (regla.fuente === 'PLANTILLA_BOVEDA' && !regla.Habilitada) return 'No habilitada en la matriz'
  if (regla.fuente === 'PLANTILLA_ASIENTO' && !regla.Estado) return 'Versión inactiva'
  if (regla.integracion === 'PENDIENTE') return 'Integración pendiente'
  if (regla.integracion === 'SIN_VERIFICAR') return 'Disponibilidad sin verificar'
  if (regla.fuente === 'PLANTILLA_BOVEDA') return 'Habilitada en la matriz'
  if (regla.vigente === null) return 'Sin fecha de evaluación'
  return regla.vigente ? 'Disponible para la fecha evaluada' : 'No seleccionada para la fecha evaluada'
}

function DatosDetalle({ campos }: { campos: Record<string, string | number> }) {
  return <dl className="grid min-w-0 gap-3 rounded-xl bg-field p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
    {Object.entries(campos).map(([etiqueta, valor]) => <div key={etiqueta} className="min-w-0 break-words">
      <dt className="text-muted-foreground">{etiqueta}</dt><dd className="font-medium">{valor}</dd>
    </div>)}
  </dl>
}

function AuditoriaRegla({ regla }: { regla: ReglaContable }) {
  return <details className="rounded-xl border border-border p-4">
    <summary className="cursor-pointer font-semibold text-heading">Información técnica y auditoría</summary>
    <div className="mt-3">
      <DatosDetalle campos={{
        Integración: integraciones[regla.integracion],
        'Evidencia de uso': uso(regla),
        Consumidor: etiquetaContable(regla.consumidor, regla.consumidor),
        ...(regla.consumidor && { 'Código del consumidor': regla.consumidor }),
        ...(regla.fuente === 'PLANTILLA_ASIENTO' && regla.Prioridad !== null && { Prioridad: regla.Prioridad }),
      }} />
    </div>
  </details>
}

const esFamiliaTraslado = (codigo: string) => /^BOV_\d{3}_TRASLADO_[IE]$/.test(codigo)

function esTraslado(regla: ReglaContable) {
  return regla.fuente === 'PLANTILLA_BOVEDA' ? regla.TipoMovimiento === 'Traslado' : esFamiliaTraslado(regla.CodigoPlantilla)
}

function AyudaTraslado() {
  return <details className="text-sm text-muted-foreground">
    <summary className="w-fit cursor-pointer font-medium text-link">¿Cómo se evalúa un traslado de Bóveda?</summary>
    <p className="mt-2">Se usan las versiones del despacho y la recepción cuando ambas están seleccionadas para la misma fecha contable. Si falta una versión seleccionada, ambas etapas usan la matriz de Bóveda.</p>
  </details>
}

function accionDetalle(regla: ReglaContable) {
  const nombre = nombreRegla(regla)
  return regla.fuente === 'PLANTILLA_ASIENTO'
    ? `Ver ${nombre}, versión ${regla.Version}`
    : `Ver Bóveda, ${nombre}, ${regla.Naturaleza === 'I' ? 'ingreso' : 'egreso'}, agencia ${regla.IdAgencia}`
}

const columnas = ['Plantilla', 'Módulo contable', 'Desde', 'Hacia', 'Estado', 'Vigencia', 'Acción']

function CeldaRegla({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return <td role="cell" className="block min-w-0 break-words lg:table-cell">
    <span className="block text-xs text-muted-foreground lg:hidden" aria-hidden="true">{etiqueta}</span>
    {children}
  </td>
}

function TablaReglas({ reglas, seleccionar }: { reglas: ReglaContable[]; seleccionar: (regla: ReglaContable) => void }) {
  return <section aria-label="Resultados de plantillas" className="min-w-0">
    <table role="table" aria-label="Catálogo de reglas contables" className="block w-full text-left text-sm lg:table lg:table-fixed">
      <thead role="rowgroup" className="sr-only bg-field lg:not-sr-only"><tr role="row">{columnas.map(columna =>
        <th key={columna} role="columnheader" scope="col" className="px-2 py-3 first:w-1/4">{columna}</th>
      )}</tr></thead>
      <tbody role="rowgroup" className="grid gap-3 lg:table-row-group">
        {reglas.map(regla => <tr role="row" key={regla.idRegla} className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-2 rounded-xl border border-border p-3 lg:table-row lg:rounded-none lg:border-0 lg:border-t lg:[&_td]:px-2 lg:[&_td]:py-3 lg:[&_th]:px-2 lg:[&_th]:py-3">
          <th role="rowheader" scope="row" className="col-span-2 block min-w-0 break-words font-medium text-heading lg:table-cell">
            {nombreRegla(regla)}{regla.fuente === 'PLANTILLA_BOVEDA' && (regla.Naturaleza === 'I' ? ' · Ingreso' : ' · Egreso')}
          </th>
          <CeldaRegla etiqueta="Módulo contable">{etiquetaContable(regla.Origen)}</CeldaRegla>
          <CeldaRegla etiqueta="Desde">{etiquetaContable(regla.desde, regla.desde)}</CeldaRegla>
          <CeldaRegla etiqueta="Hacia">{etiquetaContable(regla.hacia, regla.hacia)}</CeldaRegla>
          <CeldaRegla etiqueta="Estado">{estado(regla)}</CeldaRegla>
          <CeldaRegla etiqueta="Vigencia">{vigencia(regla)}</CeldaRegla>
          <td role="cell" className="flex min-w-0 items-end justify-end lg:table-cell">
            <Button variant="outline" size="sm" className="h-auto min-h-7 max-w-full whitespace-normal py-1 leading-tight" onClick={() => seleccionar(regla)} aria-label={accionDetalle(regla)}>Ver detalle</Button>
          </td>
        </tr>)}
      </tbody>
    </table>
  </section>
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
  const [borrador, setBorrador] = useState<Filtros>({})
  const [avanzados, setAvanzados] = useState(false)
  const [url, setUrl] = useSearchParams()
  const [idBoveda, setIdBoveda] = useState<string | null>(null)
  const version = url.get('version') ?? ''
  const id = /^[1-9]\d*$/.test(version) && Number(version) <= 2_147_483_647 ? Number(version) : null
  const agenciaSesion = useAuthStore(s => s.user?.idAgencia)
  const [mensaje, setMensaje] = useState('')
  const catalogos = useQuery({ queryKey: [...clave, 'catalogos'], queryFn: ({ signal }) => consultarCatalogosPlantillas(signal), retry: false })
  const fecha = useFechaContableActual().data?.fecha
  const contextoAgencias = useQuery({ queryKey: ['auth', 'agencias'], queryFn: ({ signal }) => obtenerContextoAgencias(signal), retry: false })
  const catalogoAgencias = useAgencias()
  const nombresAgencia = new Map(catalogoAgencias.data.map(agencia => [agencia.idAgencia, agencia.nombre]))
  const agencias = (contextoAgencias.data?.agenciasPermitidas ?? [])
    .filter(agencia => /^\d{3}$/.test(agencia.idAgencia))
    .map(agencia => ({ id: agencia.idAgencia, nombre: nombresAgencia.get(agencia.idAgencia) || agencia.codigo }))
    .sort((a, b) => compararEtiquetas(a.nombre, b.nombre) || compararEtiquetas(a.id, b.id))
  const mostrarAgencia = !borrador.origen || borrador.origen === 'BOVEDA'
  const evaluacion = { fecha: filtros.fecha, agencia: filtros.agencia }
  const lista = useQuery({
    queryKey: [...clave, 'reglas', agenciaSesion, evaluacion],
    queryFn: ({ signal }) => consultarReglasContables(evaluacion, signal), retry: false,
  })
  const reglas = lista.data?.reglas ?? []
  const reglaBoveda = reglas.find(regla => regla.fuente === 'PLANTILLA_BOVEDA' && regla.idRegla === idBoveda)
  const resultados = lista.data?.reglas.filter(regla => aplicarFiltros(regla, filtros))
  const tiposPorCodigo = new Map(catalogos.data?.tiposAsiento.map(tipo => [tipo.Codigo, tipo.Nombre]))
  const nombreTipo = (codigo: string) => !tiposPorCodigo.get(codigo) && /^[A-Z]{1,3}\d+$/.test(codigo)
    ? `Tipo de asiento · ${codigo}` : etiquetaContable(codigo, tiposPorCodigo.get(codigo))
  const modulos = [...new Set([...reglas.map(regla => regla.Origen), ...(borrador.origen ? [borrador.origen] : [])])]
    .sort((a, b) => compararEtiquetas(etiquetaContable(a), etiquetaContable(b)))
  const tipos = [...new Set([...reglas.flatMap(regla => regla.CodigoTipoAsiento ?? []), ...(borrador.tipo ? [borrador.tipo] : [])])]
    .sort((a, b) => compararEtiquetas(nombreTipo(a), nombreTipo(b)) || compararEtiquetas(a, b))
  const versiones = new Map(reglas.flatMap(regla => regla.fuente === 'PLANTILLA_ASIENTO' ? [[regla.IdPlantillaAsiento, regla] as const] : []))
  const detalle = useQuery({
    queryKey: [...clave, 'detalle', id], queryFn: ({ signal }) => consultarPlantilla(id!, signal), enabled: id !== null, retry: false, staleTime: 0,
  })

  function buscar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const datos = new FormData(evento.currentTarget)
    const texto = (campo: string) => String(datos.get(campo) ?? '').trim() || undefined
    setFiltros({
      q: texto('q'), estado: texto('estado'), origen: texto('origen'),
      tipo: texto('tipo'), fecha: texto('fecha'), agencia: texto('agencia'),
    })
    setMensaje('')
  }

  function cambiarFiltro(campo: keyof Filtros, valor: string) {
    setBorrador(actual => ({
      ...actual,
      [campo]: valor,
      ...(campo === 'origen' && valor && valor !== 'BOVEDA' && { agencia: undefined }),
    }))
  }

  function limpiarFiltros() {
    setBorrador({})
    setFiltros({})
    setAvanzados(false)
    setMensaje('')
  }

  function setId(idPlantilla: number) {
    setUrl({ version: String(idPlantilla) })
  }

  function volverAlListado() {
    if (id !== null) setUrl({})
    setIdBoveda(null)
    setMensaje('')
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
    {id === null && idBoveda === null ? <section className="grid min-w-0 gap-5 rounded-3xl border border-border bg-card p-4 sm:p-6" aria-label="Listado de plantillas">
      <form onSubmit={buscar} className="grid min-w-0 gap-4">
        <div className="grid min-w-0 items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="min-w-0">Buscar por nombre o código<Input type="search" name="q" value={borrador.q ?? ''} onChange={e => cambiarFiltro('q', e.target.value)} maxLength={100} /></label>
          <div className="min-w-0">
            <label htmlFor="plantillas-origen">Módulo contable</label>
            <select id="plantillas-origen" name="origen" className={claseSelectorPlantilla} value={borrador.origen ?? ''} onChange={e => cambiarFiltro('origen', e.target.value)}>
              <option value="">Todos</option>{modulos.map(origen => <option key={origen} value={origen}>{etiquetaContable(origen)}</option>)}
            </select>
          </div>
          <div className="min-w-0">
            <label htmlFor="plantillas-estado">Estado</label>
            <select id="plantillas-estado" name="estado" className={claseSelectorPlantilla} value={borrador.estado ?? ''} onChange={e => cambiarFiltro('estado', e.target.value)}>
              <option value="">Todos</option><option value="1">Activas o habilitadas</option><option value="0">Inactivas o no habilitadas</option>
            </select>
          </div>
          <label className="min-w-0">Fecha de evaluación<Input type="date" name="fecha" value={borrador.fecha ?? ''} onChange={e => cambiarFiltro('fecha', e.target.value)} /></label>
        </div>
        <details className="rounded-xl border border-border p-3" open={avanzados} onToggle={e => setAvanzados(e.currentTarget.open)}>
          <summary className="cursor-pointer font-medium text-heading">Filtros avanzados</summary>
          <div className="mt-3 grid min-w-0 items-start gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <label htmlFor="plantillas-tipo">Tipo de asiento</label>
              <select id="plantillas-tipo" name="tipo" className={claseSelectorPlantilla} value={borrador.tipo ?? ''} onChange={e => cambiarFiltro('tipo', e.target.value)}>
                <option value="">Todos</option>{tipos.map(tipo => <option key={tipo} value={tipo}>{nombreTipo(tipo)}</option>)}
              </select>
            </div>
            {mostrarAgencia && <div className="min-w-0">
              <label htmlFor="plantillas-agencia">Agencia de Bóveda</label>
              <select id="plantillas-agencia" name="agencia" className={claseSelectorPlantilla} value={borrador.agencia ?? ''} onChange={e => cambiarFiltro('agencia', e.target.value)} disabled={agencias.length === 0}>
                <option value="">{contextoAgencias.data?.alcanceGlobal ? 'Todas las agencias' : 'Agencia de la sesión'}</option>
                {agencias.map(agencia => <option key={agencia.id} value={agencia.id}>{agencia.nombre} · {agencia.id}</option>)}
              </select>
              {contextoAgencias.isPending && <p className="text-sm text-muted-foreground">Cargando agencias…</p>}
              {contextoAgencias.isError && <Button type="button" variant="ghost" size="sm" onClick={() => void contextoAgencias.refetch()}>Volver a consultar agencias</Button>}
              {contextoAgencias.isSuccess && agencias.length === 0 && <p className="text-sm text-muted-foreground">No hay agencias disponibles para seleccionar.</p>}
            </div>}
          </div>
        </details>
        <div className="flex flex-wrap gap-2">
          <Button type="submit">Buscar</Button>
          <Button type="button" variant="outline" onClick={limpiarFiltros}>Limpiar filtros</Button>
        </div>
      </form>
      {catalogos.isError && <ErrorPlantilla error={catalogos.error} reintentar={() => void catalogos.refetch()} />}
      {lista.isPending && <Cargando texto="Cargando plantillas…" />}
      {lista.isError && <ErrorPlantilla error={lista.error} reintentar={() => void lista.refetch()} />}
      {lista.data && <p className="text-sm text-muted-foreground">Fecha de evaluación: <span className="whitespace-nowrap">{lista.data.fechaContable ?? 'No disponible'}</span></p>}
      {lista.data?.matrizBovedaDisponible === false && <Aviso>La matriz de Bóveda no está disponible para este alcance.</Aviso>}
      {resultados?.some(regla => esTraslado(regla)) && <AyudaTraslado />}
      {resultados?.length === 0 && <Aviso>No encontramos plantillas para los filtros seleccionados.</Aviso>}
      {resultados && resultados.length > 0 && <TablaReglas reglas={resultados} seleccionar={regla => {
        if (regla.fuente === 'PLANTILLA_ASIENTO') setId(regla.IdPlantillaAsiento)
        else setIdBoveda(regla.idRegla)
      }} />}
    </section> : <>
      <Button variant="ghost" className="w-fit" onClick={volverAlListado}>Volver al listado</Button>
      {idBoveda !== null && id === null ? <>
        {lista.isPending && <Cargando texto="Cargando detalle…" />}
        {lista.isError && <ErrorPlantilla error={lista.error} reintentar={() => void lista.refetch()} />}
        {reglaBoveda?.fuente === 'PLANTILLA_BOVEDA' && <DetalleBoveda nombreTipo={nombreTipo} regla={reglaBoveda} />}
        {lista.isSuccess && !reglaBoveda && <Aviso>La regla de Bóveda no está disponible para este alcance.</Aviso>}
      </> : <>
        {detalle.isPending && <Cargando texto="Cargando detalle…" />}
        {detalle.isError && <ErrorPlantilla error={detalle.error} reintentar={() => void detalle.refetch()} />}
        {detalle.data && <DetallePlantilla key={id} plantilla={detalle.data} seleccionar={setId} alGuardar={guardar} puedeEditar={puedeEditar} fecha={fecha} catalogos={catalogos.data} versiones={versiones} />}
      </>}
    </>}
  </div>
}

function DetalleBoveda({ regla, nombreTipo }: { regla: ReglaBoveda; nombreTipo: (codigo: string) => string }) {
  const titulo = useRef<HTMLHeadingElement>(null)
  useEffect(() => { titulo.current?.focus() }, [])
  return <section className="grid min-w-0 gap-5 rounded-3xl border border-border bg-card p-4 sm:p-6">
    <header>
      <h2 ref={titulo} tabIndex={-1} className="text-2xl font-semibold text-heading">{nombreRegla(regla)}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{regla.Naturaleza === 'I' ? 'Ingreso' : 'Egreso'}</p>
    </header>
    <DatosDetalle campos={{
      Código: codigoRegla(regla),
      'Tipo de asiento': regla.CodigoTipoAsiento ? nombreTipo(regla.CodigoTipoAsiento) : 'Sin identificar',
      'Estado del tipo': etiquetaContable(regla.EstadoTipo),
      Configuración: 'Configurada',
      Aprobación: 'No aplica a la matriz',
      Operación: regla.EsManual === null ? 'Sin identificar' : regla.EsManual ? 'Manual' : 'Automática',
      Debe: regla.Debe ?? 'Sin cuenta',
      Haber: regla.Haber ?? 'Sin cuenta',
    }} />
    <DatosRegla regla={regla} />
    {regla.TipoMovimiento === 'Traslado' && <AyudaTraslado />}
    <AuditoriaRegla regla={regla} />
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
  const descripcionConcepto = catalogos?.conceptosContables.find(c => c.IdConceptoContable === plantilla.IdConceptoContable)?.ConceptoDetalle ?? plantilla.ConceptoDetalle
  const descripcionTipo = catalogos?.tiposAsiento.find(t => t.IdTipoAsiento === plantilla.IdTipoAsiento)?.Nombre ?? plantilla.NombreTipoAsiento
  const versionesAnteriores = historial.data?.filter(p => p.IdPlantillaAsiento !== id)

  return <section className="grid min-w-0 gap-5 rounded-3xl border border-border bg-card p-4 sm:p-6">
    <header>
      <h2 ref={titulo} tabIndex={-1} className="text-2xl font-semibold text-heading">{etiquetaContable(plantilla.CodigoPlantilla, plantilla.Nombre)}</h2>
      <p className="mt-1 text-sm text-muted-foreground">Versión {plantilla.Version}</p>
    </header>
    <DatosDetalle campos={{
      Código: plantilla.CodigoPlantilla,
      'Concepto contable': etiquetaContable(plantilla.CodigoConcepto, descripcionConcepto),
      'Tipo de asiento': etiquetaContable(plantilla.CodigoTipoAsiento, descripcionTipo),
      'Estado de la versión': plantilla.Estado ? 'Activa' : 'Inactiva',
      Configuración: 'Configurada',
      'Inicio de vigencia': plantilla.VigenciaDesde,
      'Fin de vigencia': plantilla.VigenciaHasta ?? 'Sin fecha de fin',
      ...(!regla && {
        'Módulo contable': etiquetaContable(plantilla.Origen),
        Evaluación: 'No disponible en el catálogo para esta versión',
      }),
    }} />
    {regla && <DatosRegla regla={regla} />}
    {esFamiliaTraslado(plantilla.CodigoPlantilla) && <AyudaTraslado />}
    <div className="grid gap-3">
      <h3 className="text-lg font-semibold text-heading">Movimientos contables</h3>
      <TablaDesplazable etiqueta="Líneas contables de la versión">
        <table className={claseTabla}>
          <thead className="bg-field"><tr>{['Orden', 'Cuenta', 'Movimiento', 'Componente'].map(col => <th key={col} scope="col">{col}</th>)}</tr></thead>
          <tbody>{plantilla.lineas.map(linea => <tr key={linea.Orden} className={claseFila}>
            <td>{linea.Orden}</td>
            <td>{linea.OrigenCuenta === 'FIJA'
              ? [linea.CodigoCuenta, linea.NombreCuenta].filter(Boolean).join(' · ') || 'Cuenta fija no disponible'
              : `${etiquetaOrigenCuenta(linea.OrigenCuenta)}${linea.CodigoRol ? ` · ${etiquetaContable(linea.CodigoRol)}` : ''}`}</td>
            <td>{etiquetaContable(linea.TipoMovimiento)}</td><td>{etiquetaContable(linea.ComponenteImporte)}</td>
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
        <Badge variant="outline">Aprobación · {etiquetaContable(solicitud.data.estado)}</Badge>
        <Button asChild variant="outline"><Link to={`/aprobaciones/${solicitud.data.idSolicitud}`}>{gestion ? 'Gestionar solicitud en Aprobaciones' : 'Ver historial de la solicitud'}</Link></Button>
      </div>}
    </section>

    {!puedeEditar && <p className="text-sm text-muted-foreground">Acceso de solo consulta. Puedes revisar las versiones y sus líneas.</p>}
    {puedeEditar && !editando && <Button className="w-fit" onClick={() => setEditando(true)}>Preparar nueva versión</Button>}
    {editando && puedeEditar && <EditarVersionPlantilla plantilla={plantilla} fecha={fecha} alGuardar={alGuardar} cerrar={() => setEditando(false)} />}

    {regla && <AuditoriaRegla regla={regla} />}

    <section className="grid gap-3" aria-label="Historial de versiones">
      <h3 className="text-lg font-semibold text-heading">Historial de versiones</h3>
      {historial.isPending && <Cargando texto="Cargando historial…" />}
      {historial.isError && <ErrorPlantilla error={historial.error} reintentar={() => void historial.refetch()} />}
      {versionesAnteriores?.length === 0 && <p className="text-sm text-muted-foreground">No hay otras versiones de esta familia.</p>}
      {Boolean(versionesAnteriores?.length) && <ul className="divide-y divide-border rounded-xl border border-border">
        {versionesAnteriores?.map(p => {
          const anterior = versiones?.get(p.IdPlantillaAsiento)
          return <li key={p.IdPlantillaAsiento} className="flex flex-wrap items-center justify-between gap-3 p-3">
            <span className="text-sm">Versión {p.Version} · {etiquetaContable(p.CodigoPlantilla, p.Nombre)} · {p.Estado ? 'Activa' : 'Inactiva'}{anterior && ` · ${vigencia(anterior)}`}</span>
            <Button variant="outline" size="sm" onClick={() => seleccionar(p.IdPlantillaAsiento)} aria-label={`Ver versión ${p.Version}`}>Ver versión</Button>
          </li>
        })}
      </ul>}
    </section>
  </section>
}
