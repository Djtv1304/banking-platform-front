export interface EventoVigencia { id: number; titulo: string; desde: string; hasta: string | null; estado: string; responsable: string }
export function LineaVigencias({ eventos }: { eventos: EventoVigencia[] }) {
  return <ol aria-label="Historial de vigencias" className="space-y-4 border-l border-border pl-5">{eventos.map(v => <li key={v.id} className="relative"><span className="absolute -left-[25px] top-2 size-2 rounded-full bg-primary" /><p className="font-semibold">{v.titulo} - {v.estado}</p><p className="text-sm text-muted-foreground">Vigencia desde <time dateTime={v.desde}>{v.desde}</time> hasta {v.hasta ? <time dateTime={v.hasta}>{v.hasta}</time> : 'sin fecha final'}</p><p className="text-sm">{v.responsable}</p></li>)}</ol>
}
