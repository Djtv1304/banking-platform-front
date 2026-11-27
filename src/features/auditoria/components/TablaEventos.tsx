import { Link } from 'react-router'

import { InsigniaEstado } from '@/shared/ui'
import type { EventoItem } from '@/features/auditoria/api/auditoria.contract'
import { textoFechaLocal, tonoResultado, tonoSeveridad } from '@/features/auditoria/lib/presentacion'

/** Lista de eventos con enlace al detalle (por AuditoriaID, el identificador que acepta la API). */
export function TablaEventos({ eventos, titulo, conAgencia = false }: { eventos: EventoItem[]; titulo: string; conAgencia?: boolean }) {
  const columnas = ['Fecha', 'Evento', 'Severidad', 'Usuario', ...(conAgencia ? ['Agencia'] : []), 'Resultado', 'Descripción']
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{titulo}</caption>
        <thead>
          <tr className="border-b border-border">
            {columnas.map((columna) => <th key={columna} scope="col" className="p-2">{columna}</th>)}
          </tr>
        </thead>
        <tbody>
          {eventos.map((evento) => (
            <tr key={evento.id} className="border-b border-border align-top">
              <td className="p-2 whitespace-nowrap">
                <time dateTime={evento.fechaHoraUtc ?? undefined}>{textoFechaLocal(evento.fechaHoraLocal)}</time>
              </td>
              <td className="p-2">
                <Link to={`/auditoria/eventos/${evento.id}`} className="font-medium text-link underline">
                  {evento.codigoEvento ?? `Evento #${evento.id}`}
                </Link>
                {evento.formatoAnterior && <span className="ml-2 text-xs text-muted-foreground">(formato anterior)</span>}
              </td>
              <td className="p-2">
                {evento.severidad && <InsigniaEstado tono={tonoSeveridad(evento.severidad)}>{evento.severidad}</InsigniaEstado>}
              </td>
              <td className="p-2">{evento.nombreUsuario ?? (evento.usuario != null ? `ID ${evento.usuario}` : '—')}</td>
              {conAgencia && <td className="p-2">{evento.agencia ?? '—'}</td>}
              <td className="p-2">
                <InsigniaEstado tono={tonoResultado(evento.resultado)}>{evento.resultado ?? '—'}</InsigniaEstado>
              </td>
              <td className="p-2 wrap-break-word">{evento.descripcion ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
