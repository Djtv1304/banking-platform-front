import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Search, SlidersHorizontal } from 'lucide-react'
import { obtenerContextoAgencias, useAuthStore } from '@/features/auth'
import { Aviso, Cargando, Input, Paginacion, ErrorApi } from '@/shared/ui'
import { listarParametros } from '@/features/parametros/api/parametros.api'

export function ParametrosPage({ auditoria = false }: { auditoria?: boolean }) {
  const usuario = useAuthStore(s => s.user)
  const [buscar, setBuscar] = useState('')
  const [buscarConsulta, setBuscarConsulta] = useState('')
  useEffect(() => { const id = setTimeout(() => setBuscarConsulta(buscar), 300); return () => clearTimeout(id) }, [buscar])
  const [modulo, setModulo] = useState('')
  const [estado, setEstado] = useState('')
  const [agencia, setAgencia] = useState(usuario?.idAgencia ?? '')
  const [page, setPage] = useState(1)
  const contexto = useQuery({ queryKey: ['auth', 'agencias'], queryFn: ({ signal }) => obtenerContextoAgencias(signal) })
  const filtros = { buscar: buscarConsulta, modulo: modulo || undefined, estado: estado || undefined, idAgencia: agencia || undefined, page }
  const lista = useQuery({ queryKey: ['parametros', usuario?.idUsuario, usuario?.idAgencia, filtros, auditoria], queryFn: ({ signal }) => listarParametros(filtros, signal, auditoria) })
  const rutaDetalle = auditoria ? '/organizacion/historial-parametros' : '/parametros'
  const filtrar = (cambiar: (valor: string) => void, valor: string) => { cambiar(valor); setPage(1) }
  const seleccionClase = 'rounded-lg border border-border bg-field px-3 py-2 text-sm'
  return <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
    <header><h1 className="flex items-center gap-3 text-[40px] font-bold tracking-tight text-heading"><SlidersHorizontal />Parametros</h1><p className="mt-2 text-muted-foreground">Valores de negocio, programaciones e historial. Las condiciones pasadas se conservan.</p></header>
    <section className="rounded-3xl border border-border bg-card p-6">
      <form className="mb-6 flex flex-wrap items-end gap-4" onSubmit={e => e.preventDefault()}>
        <label className="flex min-w-60 flex-1 flex-col gap-2 text-sm"><span className="flex items-center gap-2"><Search size={16} />Buscar parametro</span><Input value={buscar} onChange={e => filtrar(setBuscar, e.target.value)} placeholder="Clave o descripcion" /></label>
        <label className="flex flex-col gap-2 text-sm">Modulo<select className={seleccionClase} value={modulo} onChange={e => filtrar(setModulo, e.target.value)}><option value="">Todos</option>{lista.data?.modulos.map(m => <option key={m}>{m}</option>)}</select></label>
        <label className="flex flex-col gap-2 text-sm">Estado<select className={seleccionClase} value={estado} onChange={e => filtrar(setEstado, e.target.value)}><option value="">Todos</option><option value="A">Activo</option><option value="I">Inactivo</option></select></label>
        {contexto.data?.alcanceGlobal && <label className="flex flex-col gap-2 text-sm">Alcance de consulta<select className={seleccionClase} value={agencia} onChange={e => filtrar(setAgencia, e.target.value)}><option value="">Global</option>{contexto.data.agenciasPermitidas.map(a => <option key={a.idAgencia} value={a.idAgencia}>{a.codigo}</option>)}</select></label>}
      </form>
      {lista.isPending ? <Cargando texto="Cargando parametros..." /> : lista.isError ? <ErrorApi error={lista.error} /> : <>
        {lista.data.items.length === 0 ? <Aviso>No hay parametros para los filtros seleccionados.</Aviso> : <div className="overflow-x-auto"><table className="w-full min-w-[750px] text-left text-sm"><thead className="border-b border-border text-muted-foreground"><tr>{['Parametro', 'Modulo', 'Estado', 'Valor vigente', 'Proximo valor', 'Acciones'].map(t => <th key={t} scope="col" className="p-3">{t}</th>)}</tr></thead>{[...new Set(lista.data.items.map(p => p.modulo))].map(grupo => <tbody key={grupo}><tr className="bg-muted/40"><th scope="rowgroup" colSpan={6} className="p-3 text-heading">{grupo}</th></tr>{lista.data.items.filter(p => p.modulo === grupo).map(p => <tr key={p.clave} className="border-b border-border/60"><td className="p-3"><span className="block font-semibold">{p.clave}</span><span className="text-muted-foreground">{p.descripcion}</span>{p.esSensible && <span className="mt-1 block text-xs">Requiere aprobacion</span>}</td><td className="p-3">{p.modulo}</td><td className="p-3">{p.estado === 'A' ? 'Activo' : 'Inactivo'}</td><td className="p-3">{p.valorActual?.valor ?? 'Sin valor vigente'} {p.unidad}</td><td className="p-3">{p.proximoValor ? `${p.proximoValor.valor} desde ${p.proximoValor.vigenciaDesde}` : 'Sin programacion'}</td><td className="p-3"><Link className="font-semibold text-primary underline underline-offset-4" to={`${rutaDetalle}/${encodeURIComponent(p.clave)}${agencia ? `?idAgencia=${encodeURIComponent(agencia)}` : ''}`}>Ver detalle</Link></td></tr>)}</tbody>)}</table></div>}
        <div className="mt-6"><Paginacion resumen={`${lista.data.total} parametros`} page={page} totalPaginas={Math.max(1, Math.ceil(lista.data.total / lista.data.pageSize))} ocupado={lista.isFetching} onCambiar={setPage} /></div>
      </>}
    </section>
  </div>
}
