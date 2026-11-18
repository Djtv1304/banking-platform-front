export interface EventoLinea { clave: string; etiqueta: string; fecha: string; responsable: string; comentario?: string | null }
const fecha = (valor: string) => new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guayaquil' }).format(new Date(valor))
export function LineaDeTiempo({ eventos }: { eventos: readonly EventoLinea[] }) {
  return <ol aria-label="Historial de la solicitud" className="space-y-4 border-l border-border pl-5">{eventos.map((evento) => <li key={evento.clave} className="space-y-1"><p className="font-medium">{evento.etiqueta}</p><p className="text-sm text-muted-foreground"><time dateTime={evento.fecha}>{fecha(evento.fecha)}</time> · {evento.responsable}</p>{evento.comentario && <p className="whitespace-pre-wrap text-sm">{evento.comentario}</p>}</li>)}</ol>
}
