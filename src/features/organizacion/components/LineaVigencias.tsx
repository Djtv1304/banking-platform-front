import type { ReactNode } from 'react'

export interface EventoVigencia {
  id: number
  titulo: string
  desde: string
  hasta: string | null
  estado: string
  responsable: string
  valores?: Record<string, string>
}

export function LineaVigencias({ eventos, acciones }: { eventos: EventoVigencia[]; acciones?: (evento: EventoVigencia) => ReactNode }) {
  const campos = [...new Set(eventos.flatMap(v => Object.keys(v.valores ?? {})))]
  return <div className="min-w-0 max-w-full overflow-x-auto rounded-xl border border-border" role="region" aria-label="Historial de vigencias" tabIndex={0}>
    <table className="w-full text-left text-sm">
      <caption className="sr-only">Valores y periodos de los conjuntos registrados</caption>
      <thead className="bg-muted/50"><tr>{['Conjunto', ...campos, 'Desde', 'Hasta', 'Estado', 'Responsable', ...(acciones ? ['Acciones'] : [])].map(c => <th key={c} scope="col" className="whitespace-nowrap px-4 py-3 font-semibold">{c}</th>)}</tr></thead>
      <tbody>{eventos.map(v => <tr key={v.id} className="border-t border-border align-top">
        <th scope="row" className="min-w-40 px-4 py-3 font-medium">{v.titulo}</th>
        {campos.map(c => <td key={c} className="whitespace-nowrap px-4 py-3 tabular-nums">{v.valores?.[c] ?? 'No definido'}</td>)}
        <td className="whitespace-nowrap px-4 py-3"><time dateTime={v.desde}>{v.desde}</time></td>
        <td className="whitespace-nowrap px-4 py-3">{v.hasta ? <time dateTime={v.hasta}>{v.hasta}</time> : 'Sin fecha final'}</td>
        <td className="px-4 py-3"><span className="inline-block whitespace-nowrap rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{v.estado}</span></td>
        <td className="min-w-36 px-4 py-3">{v.responsable}</td>
        {acciones && <td className="px-4 py-3">{acciones(v)}</td>}
      </tr>)}</tbody>
    </table>
  </div>
}
