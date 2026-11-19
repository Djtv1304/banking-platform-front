import type { ReactNode } from 'react'

export interface EventoVigencia { id: number; titulo: string; desde: string; hasta: string | null; estado: string; responsable: string; valores?: Record<string, string> }

export function LineaVigencias({ eventos, acciones, dobleColumna = false }: { eventos: EventoVigencia[]; dobleColumna?: boolean; acciones?: (evento: EventoVigencia) => ReactNode }) {
  return <div className={`grid min-w-0 gap-4 ${dobleColumna ? '' : 'xl:grid-cols-2'}`} aria-label="Configuraciones registradas">{eventos.map(v => <article key={v.id} className="min-w-0 rounded-2xl border border-border bg-card">
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4"><h4 className="min-w-0 break-words font-semibold">{v.titulo}</h4><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{v.estado}</span></header>
    <dl className={dobleColumna ? 'grid text-sm sm:grid-cols-2' : 'divide-y divide-border text-sm'}>{Object.entries({ ...v.valores, 'Inicio de vigencia': v.desde.split('-').reverse().join('/'), 'Fin de vigencia': v.hasta ? v.hasta.split('-').reverse().join('/') : 'Sin fecha final' }).map(([campo, valor]) => <div key={campo} className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3 px-4 py-3"><dt className="break-words text-muted-foreground">{campo}</dt><dd className="min-w-0 break-words font-medium tabular-nums">{valor}</dd></div>)}</dl>
    <footer className="space-y-3 border-t border-border p-4"><p className="break-words text-xs text-muted-foreground">Responsable: {v.responsable}</p>{acciones?.(v)}</footer>
  </article>)}</div>
}
