import type { DetalleSolicitud } from '@/features/aprobaciones/api/aprobaciones.contract'
import { compararProducto, ETIQUETAS, type FichaValores } from '@/features/organizacion/lib/cambios-producto'
import { mostrarValor } from '@/shared/ui/comparador-cambios'

function Valores({ grupos, vacio }: { grupos: FichaValores[]; vacio: string }) {
  if (!grupos.length) return <p className="text-sm text-muted-foreground">{vacio}</p>
  return <div className="space-y-4">{grupos.map((g, i) => <section key={`${g.titulo}-${i}`} className="min-w-0 rounded-xl border border-border"><h4 className="border-b border-border bg-muted/40 px-4 py-3 font-semibold">{g.titulo}</h4><dl className="divide-y divide-border text-sm">{Object.entries(g.valores).map(([campo, valor]) => <div key={campo} className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3 p-3"><dt className="break-words text-muted-foreground">{ETIQUETAS[campo] ?? campo}</dt><dd className="min-w-0 break-words font-medium tabular-nums">{mostrarValor(valor)}</dd></div>)}</dl></section>)}</div>
}
export function FichaCambioProducto({ solicitud: s, canales }: { solicitud: DetalleSolicitud; canales: { idCanal: number; nombreCanal: string }[] }) {
  const cambio = compararProducto(s, canales)
  const nombre = (p: DetalleSolicitud['solicitante']) => `${p.nombre ?? 'Usuario'}${p.idInterno == null ? '' : ` (${p.idInterno})`}`
  return <div className="space-y-5" aria-label="Ficha completa del cambio"><dl className="grid gap-3 rounded-xl bg-muted/40 p-4 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Solicitado por</dt><dd>{nombre(s.solicitante)}</dd></div>{s.resolutor && <div><dt className="text-muted-foreground">Resuelto por</dt><dd>{nombre(s.resolutor)}</dd></div>}<div><dt className="text-muted-foreground">Estado de aprobacion</dt><dd>{s.estado === 'Ejecutada' ? 'Aplicado' : s.estado}</dd></div></dl><div className="grid min-w-0 gap-5 lg:grid-cols-2"><section className="min-w-0"><h3 className="mb-3 text-lg font-semibold">Antes del cambio</h3><Valores grupos={cambio.antes} vacio="No hay un conjunto anterior registrado en esta solicitud." /></section><section className="min-w-0"><h3 className="mb-3 text-lg font-semibold">Despues del cambio</h3><Valores grupos={cambio.despues} vacio="No hay un conjunto habilitado registrado en el resultado de esta solicitud." /></section></div></div>
}
