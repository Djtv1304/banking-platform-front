import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'

import { ExportarCsvButton } from '@/features/organizacion/components/ExportarCsvButton'
import { agenciaDetalleSchema } from '@/features/organizacion/api/agencias.contract'
import { paginaUsuariosSchema, type CampoOrden } from '@/features/usuarios/api/usuarios.contract'
import { ORDEN_INICIAL, siguienteOrden } from '@/features/usuarios/lib/filtros'
import { apiClient } from '@/shared/api'
import { Aviso, Button, Cargando, ErrorApi, Input, Label, Paginacion } from '@/shared/ui'

const TAMANO = 20
const columnasUsuarios: { etiqueta: string; campo: CampoOrden }[] = [
  { etiqueta: 'ID', campo: 'idUsuario' },
  { etiqueta: 'Usuario', campo: 'username' },
  { etiqueta: 'Nombres', campo: 'nombres' },
  { etiqueta: 'Estado', campo: 'estado' },
  { etiqueta: 'Roles', campo: 'roles' },
  { etiqueta: 'Agencia', campo: 'idAgencia' },
]
const filtrosVacios = { nombre: '', idUsuario: '', idAgencia: '' }
const rutas = {
  agencias: '/api/v1/seguridad/directorio-agencias',
  usuarios: '/api/v1/seguridad/directorio-usuarios',
} as const

export function DirectoriosAuditoriaPage() {
  const [directorio, setDirectorio] = useState<keyof typeof rutas>('agencias')
  const [texto, setTexto] = useState('')
  const [filtro, setFiltro] = useState('')
  const [campos, setCampos] = useState(filtrosVacios)
  const [filtrosUsuarios, setFiltrosUsuarios] = useState(filtrosVacios)
  const [orden, setOrden] = useState(ORDEN_INICIAL)
  const [page, setPage] = useState(1)
  const ruta = rutas[directorio]
  const filtros: Record<string, string> = filtro ? { q: filtro } : {}
  const parametros = directorio === 'usuarios'
    ? { ...Object.fromEntries(Object.entries(filtrosUsuarios).filter(([, valor]) => valor)), page: String(page), pageSize: String(TAMANO), sort: `${orden.campo},${orden.direccion}` }
    : filtros
  const agenciasDisponibles = useQuery({
    queryKey: ['organizacion', 'directorio', 'agencias-filtro'],
    enabled: directorio === 'usuarios',
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<unknown>(rutas.agencias, { signal })
      return agenciaDetalleSchema.array().parse(data)
    },
  })
  const consulta = useQuery({
    queryKey: ['organizacion', 'directorios', directorio, parametros],
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<unknown>(ruta, { params: parametros, signal })
      if (directorio === 'agencias') {
        const agencias = agenciaDetalleSchema.array().parse(data)
        return {
          columnas: ['Agencia', 'Código', 'Tipo', 'Estado'],
          filas: agencias.map(a => [a.idAgencia, a.codigo, a.tipoAgencia, a.estado]),
          total: agencias.length,
        }
      }
      const usuarios = paginaUsuariosSchema.parse(data)
      return {
        columnas: columnasUsuarios.map(({ etiqueta }) => etiqueta),
        filas: usuarios.items.map(u => [u.idUsuario, u.username, `${u.nombres} ${u.apellidos}`, u.estado, u.roles?.join(', ') ?? u.rol ?? '', u.idAgencia ?? '']),
        total: usuarios.total,
      }
    },
  })
  const datos = consulta.data
  const filas = directorio === 'agencias' ? datos?.filas.slice((page - 1) * TAMANO, page * TAMANO) : datos?.filas

  return <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-3xl font-bold text-heading">Directorios de auditoría</h1>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline"><Link to="/organizacion/historial-parametros">Historial de parámetros</Link></Button>
        <Button asChild variant="outline"><Link to="/aprobaciones">Historial de aprobaciones</Link></Button>
      </div>
    </header>
    <nav aria-label="Directorios" className="flex gap-2">
      {(['agencias', 'usuarios'] as const).map(tipo => <Button key={tipo} variant={directorio === tipo ? 'default' : 'outline'} aria-pressed={directorio === tipo} onClick={() => { setDirectorio(tipo); setPage(1) }}>{tipo === 'agencias' ? 'Agencias' : 'Usuarios'}</Button>)}
    </nav>
    <div className="flex flex-wrap items-end gap-3">
      {directorio === 'usuarios' ? (
        <form className="flex flex-wrap items-end gap-3" onSubmit={event => {
          event.preventDefault()
          setFiltrosUsuarios({ ...campos, nombre: campos.nombre.trim() })
          setPage(1)
        }}>
          <div className="grid gap-2">
            <Label htmlFor="directorio-nombre">Nombre</Label>
            <Input id="directorio-nombre" type="search" maxLength={100} value={campos.nombre} onChange={event => setCampos({ ...campos, nombre: event.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="directorio-id">ID de usuario</Label>
            <Input id="directorio-id" type="number" min={1} max={2147483647} step={1} value={campos.idUsuario} onChange={event => setCampos({ ...campos, idUsuario: event.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="directorio-agencia">Agencia</Label>
            <select id="directorio-agencia" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={campos.idAgencia} onChange={event => setCampos({ ...campos, idAgencia: event.target.value })}>
              <option value="">Todas</option>
              {agenciasDisponibles.data?.map(agencia => <option key={agencia.idAgencia} value={agencia.idAgencia}>{agencia.idAgencia} · {agencia.codigo}</option>)}
            </select>
            {agenciasDisponibles.isError && <span role="status" className="text-sm text-muted-foreground">No se pudieron cargar las agencias.</span>}
          </div>
          <Button type="submit" variant="outline">Aplicar filtros</Button>
          {Object.values(campos).some(Boolean) || Object.values(filtrosUsuarios).some(Boolean) ? (
            <Button type="button" variant="ghost" onClick={() => { setCampos(filtrosVacios); setFiltrosUsuarios(filtrosVacios); setPage(1) }}>Limpiar</Button>
          ) : null}
        </form>
      ) : <form className="flex items-end gap-2" onSubmit={event => { event.preventDefault(); setFiltro(texto.trim()); setPage(1) }}>
        <div className="grid gap-2"><Label htmlFor="buscar-directorio">Buscar</Label><Input id="buscar-directorio" maxLength={100} value={texto} onChange={event => setTexto(event.target.value)} /></div>
        <Button type="submit" variant="outline">Aplicar filtro</Button>
      </form>}
      <ExportarCsvButton ruta={ruta} parametros={parametros} archivo={`${directorio}.csv`} etiqueta={directorio === 'usuarios' ? 'Exportar página CSV' : 'Exportar CSV'} />
    </div>
    {consulta.isPending && <Cargando texto="Consultando directorio…" />}
    {consulta.isError && <ErrorApi error={consulta.error} />}
    {datos && (datos.total === 0 ? <Aviso>No hay resultados para este filtro.</Aviso> : <>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Directorio de {directorio}</caption>
          <thead className="bg-muted"><tr>{directorio === 'usuarios' ? columnasUsuarios.map(({ etiqueta, campo }) => {
            const activa = orden.campo === campo
            const Icono = !activa ? ChevronsUpDown : orden.direccion === 'asc' ? ArrowUp : ArrowDown
            return <th scope="col" key={campo} className="p-3" aria-sort={activa ? (orden.direccion === 'asc' ? 'ascending' : 'descending') : undefined}>
              <button type="button" className="inline-flex items-center gap-1 rounded-sm hover:text-primary focus-visible:ring-2 focus-visible:ring-ring" onClick={() => { setOrden(siguienteOrden(orden, campo)); setPage(1) }}>
                {etiqueta}<Icono aria-hidden className="size-4" />
              </button>
            </th>
          }) : datos.columnas.map(columna => <th scope="col" key={columna} className="p-3">{columna}</th>)}</tr></thead>
          <tbody>{filas?.map(fila => <tr key={fila[0]} className="border-t border-border">{fila.map((valor, indice) => <td key={datos.columnas[indice]} className="p-3">{valor}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <Paginacion resumen={`${datos.total} resultados`} page={page} totalPaginas={Math.ceil(datos.total / TAMANO)} ocupado={consulta.isFetching} onCambiar={setPage} />
    </>)}
  </div>
}
