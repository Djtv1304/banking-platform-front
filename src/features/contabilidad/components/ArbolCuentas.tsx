import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronRight } from 'lucide-react'

import { cn } from '@/shared/lib'
import { Badge } from '@/shared/ui'
import { accionTeclado, aplanarVisibles, hijosVisibles, type NodoCuenta } from '@/features/contabilidad/lib/arbol'
import { estaActiva, etiquetaNaturaleza, formatearSaldo } from '@/features/contabilidad/lib/cuenta-contable'

interface ArbolCuentasProps {
  raices: readonly NodoCuenta[]
  abiertos: ReadonlySet<number>
  /** null = sin filtro (se ve todo lo abierto) */
  visibles: ReadonlySet<number> | null
  coincidencias: ReadonlySet<number> | null
  seleccionada: number | null
  onAlternar: (id: number, abrir: boolean) => void
  onSeleccionar: (id: number) => void
}

/**
 * Plan de cuentas como árbol accesible (patrón WAI-ARIA Tree View): una sola fila en el orden de
 * tabulación (tabindex itinerante) y el resto se recorre con las flechas. Las ramas cerradas no se
 * pintan.
 */
export function ArbolCuentas({ raices, abiertos, visibles, coincidencias, seleccionada, onAlternar, onSeleccionar }: ArbolCuentasProps) {
  const filas = useMemo(() => aplanarVisibles(raices, abiertos, visibles), [raices, abiertos, visibles])
  const [foco, setFoco] = useState<number | null>(null)
  const elementos = useRef(new Map<number, HTMLLIElement>())

  const enFilas = (id: number | null) => id !== null && filas.some((fila) => fila.nodo.cuenta.idCuentaContable === id)
  const idFoco = enFilas(foco) ? foco : enFilas(seleccionada) ? seleccionada : (filas[0]?.nodo.cuenta.idCuentaContable ?? null)

  const alPulsar = (evento: KeyboardEvent<HTMLUListElement>) => {
    if (idFoco === null || evento.altKey || evento.ctrlKey || evento.metaKey) return
    const accion = accionTeclado(filas, idFoco, evento.key)
    if (!accion) return
    evento.preventDefault()
    if (accion.tipo === 'enfocar') {
      setFoco(accion.id)
      elementos.current.get(accion.id)?.focus()
    } else if (accion.tipo === 'seleccionar') onSeleccionar(accion.id)
    else onAlternar(accion.id, accion.tipo === 'abrir')
  }

  const pintar = (hermanos: readonly NodoCuenta[]) =>
    hermanos.map((nodo, indice) => {
      const { cuenta } = nodo
      const id = cuenta.idCuentaContable
      const hijos = hijosVisibles(nodo, visibles)
      const tieneHijos = hijos.length > 0
      const abierto = tieneHijos && abiertos.has(id)
      const activa = estaActiva(cuenta)
      const resaltada = coincidencias?.has(id) ?? false

      return (
        <li
          key={id}
          ref={(elemento) => {
            if (elemento) elementos.current.set(id, elemento)
            else elementos.current.delete(id)
          }}
          role="treeitem"
          aria-label={`${cuenta.codigoCuenta} ${cuenta.nombreCuenta}${activa ? '' : ', inactiva'}`}
          aria-level={nodo.nivel}
          aria-setsize={hermanos.length}
          aria-posinset={indice + 1}
          aria-expanded={tieneHijos ? abierto : undefined}
          aria-selected={id === seleccionada}
          tabIndex={id === idFoco ? 0 : -1}
          onFocus={(evento) => evento.target === evento.currentTarget && setFoco(id)}
          className="outline-none [&:focus-visible>div]:ring-2 [&:focus-visible>div]:ring-ring"
        >
          <div
            onClick={() => onSeleccionar(id)}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-lg py-1.5 pr-3 text-sm hover:bg-field',
              id === seleccionada && 'bg-primary/15 hover:bg-primary/20',
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2" style={{ paddingLeft: `${(nodo.nivel - 1) * 1.25 + 0.25}rem` }}>
              <span
                aria-hidden="true"
                onClick={(evento) => {
                  if (!tieneHijos) return
                  evento.stopPropagation()
                  onAlternar(id, !abierto)
                }}
                className={cn('flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground', tieneHijos && 'hover:bg-muted')}
              >
                {tieneHijos && <ChevronRight className={cn('size-4 transition-transform', abierto && 'rotate-90')} />}
              </span>
              <span className={cn('shrink-0 font-mono tabular-nums text-heading', resaltada && 'font-semibold')}>{cuenta.codigoCuenta}</span>
              <span className={cn('truncate', activa ? 'text-foreground' : 'text-muted-foreground', resaltada && 'font-semibold')}>
                {cuenta.nombreCuenta}
              </span>
            </div>
            <span className="hidden w-20 shrink-0 text-muted-foreground lg:block">{etiquetaNaturaleza(cuenta.naturaleza)}</span>
            <span className="hidden w-20 shrink-0 text-muted-foreground md:block">{cuenta.esImputable ? 'Sí' : 'No'}</span>
            <span className="hidden w-20 shrink-0 sm:block">
              <Badge className={cn('h-6 px-2.5', activa ? 'bg-primary/15 text-foreground' : 'bg-muted text-muted-foreground')}>
                {activa ? 'Activa' : 'Inactiva'}
              </Badge>
            </span>
            <span className="w-28 shrink-0 text-right font-medium text-heading tabular-nums">{formatearSaldo(cuenta.saldo)}</span>
          </div>
          {abierto && <ul role="group">{pintar(hijos)}</ul>}
        </li>
      )
    })

  const primerNivel = visibles ? raices.filter((raiz) => visibles.has(raiz.cuenta.idCuentaContable)) : raices

  return (
    <div className="flex flex-col gap-1">
      <div aria-hidden="true" className="flex items-center gap-3 border-b border-border pr-3 pb-2 text-xs font-semibold text-muted-foreground uppercase">
        <span className="flex-1 pl-8">Código y nombre</span>
        <span className="hidden w-20 lg:block">Naturaleza</span>
        <span className="hidden w-20 md:block">Imputable</span>
        <span className="hidden w-20 sm:block">Estado</span>
        <span className="w-28 text-right">Saldo</span>
      </div>
      <ul role="tree" aria-label="Plan de cuentas" onKeyDown={alPulsar} className="max-h-[65vh] overflow-y-auto py-1">
        {pintar(primerNivel)}
      </ul>
    </div>
  )
}
