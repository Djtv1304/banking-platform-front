import { Banknote, Coins } from 'lucide-react'

import { cn } from '@/shared/lib'
import { Aviso } from '@/shared/ui'
import { useDenominaciones } from '@/features/catalogos'
import type { Boveda } from '@/features/boveda/api/bovedas.contract'
import {
  agruparDenominaciones,
  descuadre,
  etiquetaValor,
  formatearCantidad,
  formatearMonto,
  type GrupoPiezas,
} from '@/features/boveda/lib/formato'

/** BOV-02 · Efectivo de la bóveda por denominación: billetes y monedas por separado */
export function Denominaciones({ boveda }: { boveda: Boveda }) {
  const { data: catalogo } = useDenominaciones()
  const grupos = agruparDenominaciones(boveda.denominaciones, catalogo)
  const diferencia = descuadre(boveda)

  if (grupos.length === 0) return <Aviso>Esta bóveda no tiene efectivo registrado por denominación.</Aviso>

  return (
    <div className="flex flex-col gap-6">
      {grupos.map((grupo) => (
        <Grupo key={grupo.tipo} grupo={grupo} />
      ))}

      <div className="flex items-baseline justify-between gap-4 border-t border-border pt-4">
        <span className="text-sm text-muted-foreground">Total por denominaciones</span>
        <span className="text-lg font-semibold text-heading tabular-nums">{formatearMonto(boveda.totalDesglose)}</span>
      </div>

      {diferencia !== 0 && (
        <Aviso tono="error">
          El conteo por denominaciones no coincide con el saldo: hay {formatearMonto(Math.abs(diferencia))}{' '}
          {diferencia > 0 ? 'de más' : 'de menos'} en el desglose.
        </Aviso>
      )}
    </div>
  )
}

function Grupo({ grupo }: { grupo: GrupoPiezas }) {
  const esBillete = grupo.tipo === 'Billete'
  const Icono = esBillete ? Banknote : Coins
  const nombre = esBillete ? 'Billetes' : 'Monedas'

  return (
    <table className="relative w-full table-fixed text-left text-sm">
      <caption className="mb-1 text-left">
        <span className="flex items-center gap-2 text-[15px] font-semibold text-heading">
          <Icono aria-hidden className="size-4 text-muted-foreground" />
          {nombre}
          <span className="ml-auto text-sm font-normal text-muted-foreground tabular-nums">
            {formatearCantidad(grupo.cantidad)} {grupo.cantidad === 1 ? 'pieza' : 'piezas'} · {formatearMonto(grupo.subtotal)}
          </span>
        </span>
      </caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">Denominación</th>
          <th scope="col">Cantidad</th>
          <th scope="col">Parte del efectivo</th>
          <th scope="col">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        {grupo.piezas.map((pieza) => (
          <tr key={pieza.idDenominacion} className={cn('border-b border-border last:border-b-0', pieza.cantidad === 0 && 'text-muted-foreground')}>
            <th scope="row" className={cn('w-16 py-2.5 pr-3 font-semibold tabular-nums', pieza.cantidad > 0 && 'text-heading')}>
              {etiquetaValor(pieza.valor)}
            </th>
            <td className="w-24 py-2.5 pr-4 whitespace-nowrap tabular-nums">× {formatearCantidad(pieza.cantidad)}</td>
            <td className="py-2.5 pr-3">
              <span className="sr-only">{pieza.porcentaje.toFixed(1)} %</span>
              <span aria-hidden className="block h-1.5 overflow-hidden rounded-full bg-muted">
                {/* Un subtotal mínimo igual deja ver un punto de barra */}
                <span
                  className="block h-full rounded-full bg-heading/70"
                  style={{ width: pieza.subtotal > 0 ? `max(${pieza.porcentaje}%, 3px)` : 0 }}
                />
              </span>
            </td>
            <td className={cn('w-32 py-2.5 text-right whitespace-nowrap tabular-nums', pieza.cantidad > 0 && 'font-medium text-heading')}>
              {formatearMonto(pieza.subtotal)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
