import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'

import { hasPermission, PERMISOS, useAuthStore, usePermisos } from '@/features/auth'
import {
  consultarCatalogosPlantillas, consultarPlantilla, consultarSolicitudPlantilla, listarPlantillas,
  type FiltrosPlantillas, type PlantillaDetallada,
} from '@/features/contabilidad/api/plantillas.api'
import { EditarVersionPlantilla } from '@/features/contabilidad/components/EditarVersionPlantilla'
import { ErrorPlantilla } from '@/features/contabilidad/components/ErrorPlantilla'
import { useFechaContableActual } from '@/features/contabilidad/hooks/useFechaContable'
import { claseSelectorPlantilla, estadoPlantilla, etiquetaPlantilla, origenesPlantilla } from '@/features/contabilidad/lib/plantillas'
import { Aviso, Badge, Button, Cargando, Input } from '@/shared/ui'

const clave = ['contabilidad', 'plantillas'] as const
const claseTabla = 'w-full text-left text-sm [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-2.5'
const claseFila = 'border-t border-border'
type Catalogos = Awaited<ReturnType<typeof consultarCatalogosPlantillas>>

export function PlantillasPage() {
  const permisos = usePermisos()
  const esContador = useAuthStore(s => s.user?.roles.some(rol => rol.trim().toUpperCase() === 'CONTADOR') ?? false)
  const puedeEditar = hasPermission(permisos, PERMISOS.plantillasEditar) && esContador
  const cliente = useQueryClient()
  const [filtros, setFiltros] = useState<FiltrosPlantillas>({})
  const [id, setId] = useState<number | null>(null)
  const [mensaje, setMensaje] = useState('')
  const catalogos = useQuery({ queryKey: [...clave, 'catalogos'], queryFn: ({ signal }) => consultarCatalogosPlantillas(signal), retry: false })
  const fecha = useFechaContableActual().data?.fecha
  const lista = useQuery({ queryKey: [...clave, 'listado', filtros], queryFn: ({ signal }) => listarPlantillas(filtros, signal), retry: false, staleTime: 0 })
  const detalle = useQuery({
    queryKey: [...clave, 'detalle', id], queryFn: ({ signal }) => consultarPlantilla(id!, signal), enabled: id !== null, retry: false, staleTime: 0,
  })

  function buscar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const datos = new FormData(evento.currentTarget)
    const texto = (campo: string) => String(datos.get(campo) ?? '').trim() || undefined
    const estado = texto('estado')
    const nuevos: FiltrosPlantillas = {
      q: texto('q'), codigo: texto('codigo'), estado: estado === '0' ? 0 : estado === '1' ? 1 : undefined,
      origen: texto('origen'), idTipoAsiento: Number(texto('tipo')) || undefined,
    }
    setFiltros(nuevos)
    setId(null)
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
    {id === null ? <section className="grid min-w-0 gap-5 rounded-3xl border border-border bg-card p-4 sm:p-6" aria-label="Listado de plantillas">
      <form noValidate onSubmit={buscar} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1.5fr_auto]">
        <label>Buscar por nombre o código<Input type="search" name="q" defaultValue={filtros.q} maxLength={100} /></label>
        <label>Código exacto<Input name="codigo" defaultValue={filtros.codigo} maxLength={50} /></label>
        <div><label htmlFor="plantillas-estado">Estado</label><select id="plantillas-estado" name="estado" className={claseSelectorPlantilla} defaultValue={filtros.estado ?? ''}>
          <option value="">Todos</option><option value="1">Activas</option><option value="0">Inactivas</option>
        </select></div>
        <div><label htmlFor="plantillas-origen">Origen</label><select id="plantillas-origen" name="origen" className={claseSelectorPlantilla} defaultValue={filtros.origen ?? ''}>
          <option value="">Todos</option>{origenesPlantilla.map(origen => <option key={origen} value={origen}>{etiquetaPlantilla(origen)}</option>)}
        </select></div>
        <div><label htmlFor="plantillas-tipo">Tipo de asiento</label><select id="plantillas-tipo" name="tipo" className={claseSelectorPlantilla} defaultValue={filtros.idTipoAsiento ?? ''} disabled={!catalogos.data}>
          <option value="">Todos</option>{catalogos.data?.tiposAsiento.map(tipo => <option key={tipo.IdTipoAsiento} value={tipo.IdTipoAsiento}>{tipo.Nombre}</option>)}
        </select></div>
        <Button type="submit">Buscar</Button>
      </form>
      {catalogos.isError && <ErrorPlantilla error={catalogos.error} reintentar={() => void catalogos.refetch()} />}
      {lista.isPending && <Cargando texto="Cargando plantillas…" />}
      {lista.isError && <ErrorPlantilla error={lista.error} reintentar={() => void lista.refetch()} />}
      {lista.data?.length === 0 && <Aviso>No encontramos plantillas para los filtros seleccionados.</Aviso>}
      {Boolean(lista.data?.length) && <div className="overflow-x-auto rounded-xl border border-border" tabIndex={0} role="region" aria-label="Resultados de plantillas">
        <table className={claseTabla}>
          <thead className="bg-field"><tr>{['Nombre', 'Código', 'Concepto', 'Origen', 'Tipo de asiento', 'Estado contable', 'Versión', 'Acción'].map(col => <th key={col} scope="col">{col}</th>)}</tr></thead>
          <tbody>{lista.data?.map(p => <tr key={p.IdPlantillaAsiento} className={claseFila}>
            <th scope="row" className="min-w-36 font-medium text-heading">{p.Nombre}</th>
            <td>{p.CodigoPlantilla}</td><td>{p.ConceptoDetalle ?? 'Sin descripción'}</td><td>{etiquetaPlantilla(p.Origen)}</td>
            <td>{p.NombreTipoAsiento ?? 'Sin descripción'}</td><td><Badge variant="outline">{estadoPlantilla(p, fecha)}</Badge></td><td>{p.Version}</td>
            <td><Button variant="outline" size="sm" onClick={() => setId(p.IdPlantillaAsiento)} aria-label={`Ver ${p.Nombre}, versión ${p.Version}`}>Ver detalle</Button></td>
          </tr>)}</tbody>
        </table>
      </div>}
    </section> : <>
      <Button variant="ghost" className="w-fit" onClick={() => { setId(null); setMensaje('') }}>Volver al listado</Button>
      {detalle.isPending && <Cargando texto="Cargando detalle…" />}
      {detalle.isError && <ErrorPlantilla error={detalle.error} reintentar={() => void detalle.refetch()} />}
      {detalle.data && <DetallePlantilla key={id} plantilla={detalle.data} seleccionar={setId} alGuardar={guardar} puedeEditar={puedeEditar} fecha={fecha} catalogos={catalogos.data} />}
    </>}
  </div>
}

interface DetallePlantillaProps {
  plantilla: PlantillaDetallada
  seleccionar: (id: number) => void
  alGuardar: (id: number) => void
  puedeEditar: boolean
  fecha?: string
  catalogos?: Catalogos
}

export function DetallePlantilla({ plantilla, seleccionar, alGuardar, puedeEditar, fecha, catalogos }: DetallePlantillaProps) {
  const [editando, setEditando] = useState(false)
  const titulo = useRef<HTMLHeadingElement>(null)
  useEffect(() => { titulo.current?.focus() }, [])
  const id = plantilla.IdPlantillaAsiento
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
        <Badge variant="outline">{estadoPlantilla(plantilla, fecha)}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{plantilla.CodigoPlantilla} · Versión {plantilla.Version}</p>
    </header>
    <dl className="grid gap-3 rounded-xl bg-field p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <div><dt className="text-muted-foreground">Concepto contable</dt><dd className="font-medium">{concepto ?? 'Sin descripción'}</dd></div>
      <div><dt className="text-muted-foreground">Tipo de asiento</dt><dd className="font-medium">{tipo ?? 'Sin descripción'}</dd></div>
      <div><dt className="text-muted-foreground">Origen</dt><dd className="font-medium">{etiquetaPlantilla(plantilla.Origen)}</dd></div>
      <div><dt className="text-muted-foreground">Vigencia</dt><dd className="font-medium">Desde {plantilla.VigenciaDesde}{plantilla.VigenciaHasta && ` hasta ${plantilla.VigenciaHasta}`}</dd></div>
    </dl>
    <div className="grid gap-3">
      <h3 className="text-lg font-semibold text-heading">Movimientos contables</h3>
      <div className="overflow-x-auto rounded-xl border border-border" tabIndex={0} role="region" aria-label="Líneas contables de la versión">
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
      </div>
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
        {versionesAnteriores?.map(p => <li key={p.IdPlantillaAsiento} className="flex flex-wrap items-center justify-between gap-3 p-3">
          <span className="text-sm">Versión {p.Version} · {p.Nombre} · {estadoPlantilla(p, fecha)}</span>
          <Button variant="outline" size="sm" onClick={() => seleccionar(p.IdPlantillaAsiento)} aria-label={`Ver versión ${p.Version}`}>Ver versión</Button>
        </li>)}
      </ul>}
    </section>
  </section>
}
