import type { ReactNode } from 'react'

import { cn } from '@/shared/lib'
import { Badge } from '@/shared/ui'
import type { NodoCuenta } from '@/features/contabilidad/lib/arbol'
import {
  esNivelRegulador,
  estaActiva,
  etiquetaNaturaleza,
  etiquetaTipo,
  formatearSaldo,
} from '@/features/contabilidad/lib/cuenta-contable'

interface DetalleCuentaProps {
  nodo: NodoCuenta
  padre: NodoCuenta | undefined
  /** Acciones de mantenimiento (solo CONTADOR y ADMIN) */
  acciones?: ReactNode
}

function Dato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-semibold text-muted-foreground uppercase">{label}</dt>
      <dd className="text-sm text-heading">{children}</dd>
    </div>
  )
}

/** Datos de la cuenta seleccionada en el árbol */
export function DetalleCuenta({ nodo, padre, acciones }: DetalleCuentaProps) {
  const { cuenta } = nodo
  const activa = estaActiva(cuenta)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-sm text-muted-foreground tabular-nums">{cuenta.codigoCuenta}</p>
        <h2 className="text-xl font-bold tracking-tight text-heading">{cuenta.nombreCuenta}</h2>
        <div className="flex flex-wrap gap-2">
          <Badge className={cn('h-6 px-2.5', activa ? 'bg-primary/15 text-foreground' : 'bg-muted text-muted-foreground')}>
            {activa ? 'Activa' : 'Inactiva'}
          </Badge>
          {esNivelRegulador(cuenta.codigoCuenta) && (
            <Badge variant="outline" className="h-6 px-2.5">
              Catálogo del regulador
            </Badge>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4">
        <Dato label="Saldo">
          <span className="text-lg font-bold tabular-nums">{formatearSaldo(cuenta.saldo)}</span>
        </Dato>
        <Dato label="Tipo">{etiquetaTipo(cuenta.tipoCuenta)}</Dato>
        <Dato label="Naturaleza">{etiquetaNaturaleza(cuenta.naturaleza)}</Dato>
        <Dato label="Imputable">{cuenta.esImputable ? 'Sí, recibe movimientos' : 'No, agrupa subcuentas'}</Dato>
        <Dato label="Nivel">{nodo.nivel}</Dato>
        <Dato label="Subcuentas">{nodo.hijos.length}</Dato>
        <div className="col-span-2">
          <Dato label="Cuenta superior">
            {padre ? `${padre.cuenta.codigoCuenta} · ${padre.cuenta.nombreCuenta}` : 'Ninguna (primer nivel)'}
          </Dato>
        </div>
      </dl>

      {acciones}
    </div>
  )
}
