import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAgencias } from '@/features/catalogos'
import { refreshSession, hasPermission, PERMISOS, usePermisos, usePuedeFuncion } from '@/features/auth'
import { Aviso, Button, Cargando, ErrorApi } from '@/shared/ui'
import { toApiError } from '@/shared/api'
import { cambioSinConfirmar, mensajeErrorCambio } from '@/features/usuarios/api/usuarios.api'
import { useRecuperacionUsuario } from '@/features/usuarios/hooks/useUsuarios'
import { admiteVariasAgencias } from '@/features/usuarios/lib/formato'
import { obtenerAsignaciones, guardarAsignaciones, obtenerHistorialAgencias, type Asignaciones } from '@/features/usuarios/api/agencias'

export function AgenciasUsuarioPanel({ idUsuario, roles, esPropio, onGuardado }: { idUsuario: number; roles: readonly string[]; esPropio: boolean; onGuardado: (mensaje: string) => void }) {
  const [historial, setHistorial] = useState(false)
  const [page, setPage] = useState(1)
  const lectura = useQuery({ queryKey: ['usuarios', 'agencias', idUsuario], queryFn: ({ signal }) => obtenerAsignaciones(idUsuario, signal), retry: false, refetchOnWindowFocus: false })
  const cambios = useQuery({ queryKey: ['usuarios', 'agencias-historial', idUsuario, page], queryFn: ({ signal }) => obtenerHistorialAgencias(idUsuario, page, signal), enabled: historial, retry: false })
  return <section className="mt-5 flex flex-col gap-4" aria-label="Asignaciones de agencias">
    <h3 className="text-lg font-semibold">Agencias asignadas</h3>
    {lectura.isPending && <Cargando texto="Consultando asignaciones..." />}
    {lectura.isError && <ErrorApi error={lectura.error} />}
    {lectura.data && <EditorAsignaciones key={lectura.data.version} asignaciones={lectura.data} roles={roles} esPropio={esPropio} onGuardado={onGuardado} />}
    <Button variant="outline" onClick={() => setHistorial(!historial)}>{historial ? 'Ocultar historial' : 'Ver historial de agencias'}</Button>
    {historial && <div className="space-y-3 overflow-x-auto">
      {cambios.isPending && <Cargando texto="Consultando historial..." />}
      {cambios.isError && <ErrorApi error={cambios.error} />}
      {cambios.data && <>
        {cambios.data.total === 0 ? <Aviso>No hay cambios registrados.</Aviso> : <table className="w-full text-left text-sm"><caption className="sr-only">Historial de asignaciones por usuario</caption><thead><tr><th>Fecha UTC</th><th>Accion</th><th>Agencia</th><th>Agencia principal</th><th>Responsable (ID)</th></tr></thead><tbody>{cambios.data.items.map((c) => <tr key={c.idHistorial} className="border-t border-border"><td className="p-2">{c.fechaUtc}</td><td>{c.accion}</td><td>{c.idAgencia ?? '-'}</td><td>{c.principalNueva ?? '-'}</td><td>{c.realizadoPor === null ? 'Migracion' : (c.nombreActor?.trim() || 'Usuario') + ' (' + c.realizadoPor + ')'}</td></tr>)}</tbody></table>}
        <div className="flex items-center gap-3"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button><span>Pagina {page}</span><Button variant="outline" disabled={page * 20 >= cambios.data.total} onClick={() => setPage(page + 1)}>Siguiente</Button></div>
      </>}
    </div>}
  </section>
}

function EditorAsignaciones({ asignaciones, roles, esPropio, onGuardado }: { asignaciones: Asignaciones; roles: readonly string[]; esPropio: boolean; onGuardado: (mensaje: string) => void }) {
  const tienePermiso = usePuedeFuncion('usuarios.administrar', hasPermission(usePermisos(), PERMISOS.usuariosEditar))
  const recuperacion = useRecuperacionUsuario(asignaciones.idUsuario)
  const [consultar, setConsultar] = useState(false)
  const [recargando, setRecargando] = useState(false)
  const [errorConsulta, setErrorConsulta] = useState<unknown>(null)
  const esCajero = roles.includes('CAJERO')
  const puedeEditar = tienePermiso && !esPropio && !esCajero
  const catalogo = useAgencias()
  const cache = useQueryClient()
  const [seleccion, setSeleccion] = useState(() => asignaciones.agencias.map((a) => a.idAgencia))
  const [principal, setPrincipal] = useState(asignaciones.idAgenciaPrincipal ?? '')
  const simple = !admiteVariasAgencias(roles)
  const edicion = useMutation({ mutationFn: () => guardarAsignaciones(asignaciones.idUsuario, { idAgencias: seleccion, idAgenciaPrincipal: principal || null, version: asignaciones.version }), retry: false, onError: (error) => {
    setConsultar(cambioSinConfirmar(error))
  }, onSuccess: async () => {
    await Promise.all([cache.invalidateQueries({ queryKey: ['usuarios'] }), cache.invalidateQueries({ queryKey: ['auth', 'agencias'] })])
    await refreshSession()
    onGuardado('Guardamos las asignaciones y la agencia principal.')
  } })
  const ids = new Set(catalogo.data.map((a) => a.idAgencia))
  const opciones = [...catalogo.data.map((a) => ({ idAgencia: a.idAgencia, codigo: a.nombre, estado: a.estado })), ...asignaciones.agencias.filter((a) => !ids.has(a.idAgencia))]
  return <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (puedeEditar && !recuperacion && !consultar && !recargando && !edicion.isPending) edicion.mutate() }}>
    <p className="text-sm text-muted-foreground">{simple ? 'Este usuario puede tener una sola agencia según sus roles.' : 'Puede operar en las agencias asignadas según sus roles y permisos.'} {esCajero && 'El traslado se realiza con Cambiar agencia y exige no tener jornada abierta.'}</p>
    {catalogo.isError && <Aviso tono="error">No pudimos cargar el catalogo de agencias.</Aviso>}
    <fieldset disabled={!puedeEditar || edicion.isPending} className="space-y-2"><legend className="font-medium">Asignaciones vigentes</legend>
      {opciones.map((a) => <label key={a.idAgencia} className="flex min-h-10 items-center gap-3"><input type="checkbox" checked={seleccion.includes(a.idAgencia)} disabled={a.estado !== 'A' && !seleccion.includes(a.idAgencia)} onChange={(e) => {
        const nuevas = e.target.checked ? (simple ? [a.idAgencia] : [...seleccion, a.idAgencia]) : seleccion.filter((id) => id !== a.idAgencia)
        setSeleccion(nuevas)
        if (!nuevas.includes(principal)) setPrincipal(nuevas[0] ?? '')
      }} />{a.idAgencia} - {a.codigo}{a.estado !== 'A' ? ' (Inactiva)' : ''}</label>)}
      <label className="flex flex-col gap-2">Agencia principal<select aria-label="Agencia principal" className="rounded-lg border border-border bg-card p-2" value={principal} onChange={(e) => setPrincipal(e.target.value)}><option value="">Sin agencia principal</option>{opciones.filter((a) => seleccion.includes(a.idAgencia)).map((a) => <option key={a.idAgencia} value={a.idAgencia} disabled={a.estado !== 'A'}>{a.idAgencia} - {a.codigo}</option>)}</select></label>
    </fieldset>
    {edicion.isError && <Aviso tono="error">{mensajeErrorCambio(edicion.error)}</Aviso>}
    {errorConsulta != null && <ErrorApi error={errorConsulta} />}
    {consultar && <Button type="button" variant="outline" disabled={recargando} onClick={async () => {
      setRecargando(true)
      setErrorConsulta(null)
      try {
        const vigentes = await obtenerAsignaciones(asignaciones.idUsuario)
        cache.setQueryData(['usuarios', 'agencias', asignaciones.idUsuario], vigentes)
        if (toApiError(edicion.error).code !== 'USUARIO_EN_CONCILIACION') setConsultar(false)
      } catch (error) {
        setErrorConsulta(error)
      } finally {
        setRecargando(false)
      }
    }}>Recargar asignaciones</Button>}
    {puedeEditar && <Button type="submit" disabled={!!recuperacion || consultar || recargando || edicion.isPending || (seleccion.length > 0 && !principal) || catalogo.isLoading}>{edicion.isPending ? 'Guardando...' : 'Guardar asignaciones'}</Button>}
  </form>
}
