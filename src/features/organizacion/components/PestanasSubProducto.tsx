import { Link } from 'react-router'
import { Button } from '@/shared/ui'
import type { ClaseConjunto } from '@/features/organizacion/api/programacion.contract'

const NOMBRES = { condiciones: 'Condiciones', cupos: 'Cupos por canal', restricciones: 'Restricciones', numeracion: 'Numeracion' }
export function PestanasSubProducto({ id, tipo, activa, onSeleccionar }: { id: number; tipo: string; activa: ClaseConjunto | 'numeracion'; onSeleccionar?: (clase: ClaseConjunto) => void }) {
  const clases: (ClaseConjunto | 'numeracion')[] = tipo === 'Cuenta' ? ['condiciones', 'cupos', 'restricciones', 'numeracion'] : tipo === 'Tarjeta' ? ['condiciones', 'cupos'] : ['condiciones']
  return <div role="tablist" aria-label="Configuracion del subproducto" className="flex flex-wrap gap-2">{clases.map(t => t !== 'numeracion' && onSeleccionar ? <Button key={t} role="tab" aria-selected={activa === t} variant={activa === t ? 'default' : 'outline'} onClick={() => onSeleccionar(t)}>{NOMBRES[t]}</Button> : <Button key={t} asChild variant={activa === t ? 'default' : 'outline'}><Link role="tab" aria-selected={activa === t} to={t === 'numeracion' ? `/productos/subproductos/${id}/numeracion` : `/productos/subproductos/${id}/condiciones?tab=${t}`}>{NOMBRES[t]}</Link></Button>)}</div>
}
