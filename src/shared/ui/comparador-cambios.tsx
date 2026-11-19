import type { ReactNode } from 'react'

const ETIQUETAS: Record<string, string> = { montoAperturaMinimo: 'Monto minimo de apertura (USD)', saldoMinimo: 'Saldo minimo (USD)', tasaInteresAnual: 'Tasa anual (%)', costoMantenimiento: 'Mantenimiento (USD)', periodicidadInteres: 'Periodicidad de interes', periodicidadCosto: 'Periodicidad de mantenimiento', mesesInactividad: 'Meses de inactividad', aplicaACuentasExistentes: 'Aplicar a cuentas existentes', vigenciaDesde: 'Fecha de inicio', vigenciaHasta: 'Fecha final', cupoDiarioMaximo: 'Cupo diario (USD)', cupoMensualMaximo: 'Cupo mensual (USD)', montoMaxTransaccion: 'Maximo por transaccion (USD)', maxTransaccionesDia: 'Transacciones por dia', tipoRestriccion: 'Tipo de restriccion', descripcion: 'Descripcion', cantidad: 'Cantidad', monto: 'Monto (USD)', dias: 'Dias' }
export function nombreCampo(clave: string): string {
  return ETIQUETAS[clave] ?? clave.replaceAll('_', ' ').replace(/([a-z])([A-Z])/g, '$1 $2')
}
const NUMERICOS = new Set(['montoAperturaMinimo', 'saldoMinimo', 'tasaInteresAnual', 'costoMantenimiento', 'mesesInactividad', 'cupoDiarioMaximo', 'cupoMensualMaximo', 'montoMaxTransaccion', 'maxTransaccionesDia', 'dias', 'monto', 'cantidad'])
function decimal(valor: unknown): string | null {
  if (typeof valor !== 'string' && typeof valor !== 'number') return null
  const texto = String(valor)
  if (!/^-?\d+(\.\d+)?$/.test(texto)) return null
  const negativo = texto.startsWith('-'), [entero, fraccion = ''] = texto.replace(/^-/, '').split('.')
  const normalizado = `${entero.replace(/^0+(?=\d)/, '')}.${fraccion.replace(/0+$/, '')}`
  return negativo && normalizado !== '0.' ? `-${normalizado}` : normalizado
}
function comparable(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(comparable)
  if (valor && typeof valor === 'object') return Object.fromEntries(Object.entries(valor).filter(([k]) => !k.startsWith('_')).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, comparable(v)]))
  return valor
}
export function valoresIguales(antes: unknown, despues: unknown, campo: string): boolean {
  const ultimo = campo.split('.').at(-1) ?? campo, nombre = ultimo ? ultimo[0].toLowerCase()+ultimo.slice(1) : ultimo
  if (NUMERICOS.has(nombre)) {
    const a = decimal(antes), b = decimal(despues)
    if (a !== null && b !== null) return a === b
  }
  return JSON.stringify(comparable(antes)) === JSON.stringify(comparable(despues))
}
function filas(valor: Record<string, unknown>, prefijo = ''): Record<string, unknown> {
  return Object.fromEntries(Object.entries(valor).flatMap(([clave, dato]) => {
    if (clave.startsWith('_')) return []
    const nombre = prefijo ? `${prefijo}.${clave}` : clave
    return dato && typeof dato === 'object' && !Array.isArray(dato) ? Object.entries(filas(dato as Record<string, unknown>, nombre)) : [[nombre, dato]]
  }))
}
export function mostrarValor(valor: unknown): ReactNode {
  if (valor === undefined) return 'Sin valor'
  if (valor === null) return 'No aplica'
  if (typeof valor === 'boolean') return valor ? 'Si' : 'No'
  if (Array.isArray(valor)) return valor.length ? <ul className="space-y-2">{valor.map((item, i) => <li key={i} className="rounded border border-border p-2">{mostrarValor(item)}</li>)}</ul> : 'Ninguno'
  if (typeof valor === 'object') return <dl className="space-y-1">{Object.entries(valor).filter(([clave]) => !clave.startsWith('_')).map(([clave, dato]) => <div key={clave}><dt className="inline font-medium">{nombreCampo(clave)}: </dt><dd className="inline">{mostrarValor(dato)}</dd></div>)}</dl>
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) return new Date(`${valor}T12:00:00Z`).toLocaleDateString('es-EC', { timeZone: 'UTC' })
  return String(valor)
}

/** Comparacion de datos suministrados por el backend; no reconstruye un resultado local. */
export function ComparadorCambios({ antes, despues }: { antes: Record<string, unknown>; despues: Record<string, unknown> }) {
  const a = filas(antes), b = filas(despues)
  const claves = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(clave => !valoresIguales(a[clave], b[clave], clave)).sort((a, b) => a.localeCompare(b, 'es'))
  if (!claves.length) return <p className="text-sm text-muted-foreground">No hay valores modificados en este conjunto.</p>
  return <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full text-left text-sm"><caption className="sr-only">Comparacion del estado anterior y el cambio propuesto</caption>
    <thead className="bg-muted/50"><tr><th scope="col" className="p-3">Campo</th><th scope="col" className="p-3">Antes</th><th scope="col" className="p-3">Despues</th></tr></thead>
    <tbody>{claves.map((clave) => <tr key={clave} className="border-t border-border"><th scope="row" className="p-3 font-medium">{clave.split('.').map(nombreCampo).join(' / ')}<span className="ml-2 rounded bg-amber-100 px-1 text-xs text-amber-950">Cambio</span></th><td className="max-w-md break-words whitespace-pre-wrap p-3">{mostrarValor(a[clave])}</td><td className="max-w-md break-words whitespace-pre-wrap p-3">{mostrarValor(b[clave])}</td></tr>)}</tbody>
  </table></div>
}
