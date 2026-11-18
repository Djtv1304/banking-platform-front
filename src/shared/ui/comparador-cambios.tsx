function filas(valor: Record<string, unknown>, prefijo = ''): Record<string, unknown> {
  return Object.fromEntries(Object.entries(valor).flatMap(([clave, dato]) => {
    const nombre = prefijo ? `${prefijo}.${clave}` : clave
    return dato && typeof dato === 'object' && !Array.isArray(dato) ? Object.entries(filas(dato as Record<string, unknown>, nombre)) : [[nombre, dato]]
  }))
}
function mostrar(valor: unknown) { return valor === undefined ? 'Sin valor' : valor === null ? 'No aplica' : typeof valor === 'object' ? JSON.stringify(valor) : String(valor) }

/** Comparacion de datos suministrados por el backend; no reconstruye un resultado local. */
export function ComparadorCambios({ antes, despues }: { antes: Record<string, unknown>; despues: Record<string, unknown> }) {
  const a = filas(antes), b = filas(despues)
  const claves = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()
  return <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full text-left text-sm"><caption className="sr-only">Comparacion del estado anterior y el cambio propuesto</caption>
    <thead className="bg-muted/50"><tr><th scope="col" className="p-3">Campo</th><th scope="col" className="p-3">Antes</th><th scope="col" className="p-3">Despues</th></tr></thead>
    <tbody>{claves.map((clave) => <tr key={clave} className="border-t border-border"><th scope="row" className="p-3 font-medium">{clave}{JSON.stringify(a[clave]) !== JSON.stringify(b[clave]) && <span className="ml-2 rounded bg-amber-100 px-1 text-xs text-amber-950">Cambio</span>}</th><td className="max-w-md break-words whitespace-pre-wrap p-3">{mostrar(a[clave])}</td><td className="max-w-md break-words whitespace-pre-wrap p-3">{mostrar(b[clave])}</td></tr>)}</tbody>
  </table></div>
}
