import type { UseFormRegisterReturn } from 'react-hook-form'
import { Banknote, Coins } from 'lucide-react'

import { cn } from '@/shared/lib'
import { Input } from '@/shared/ui'
import type { Denominacion } from '@/features/catalogos'
import { etiquetaValor, formatearCantidad, formatearMonto } from '@/features/boveda/lib/formato'
import { claveDenominacion, leerCantidad, type Cantidades } from '@/features/boveda/lib/operaciones'

interface CuadriculaDenominacionesProps {
  /** Catálogo CAT-05: billetes primero y de mayor a menor valor */
  denominaciones: readonly Denominacion[]
  cantidades: Cantidades
  registrar: (idDenominacion: number) => UseFormRegisterReturn
  /** Errores por denominación (clave `d{id}`) */
  errores?: Partial<Record<string, string>>
  /** Piezas que hay hoy en la bóveda: se muestran al sacar efectivo y marcan lo que no alcanza */
  disponibles?: ReadonlyMap<number, number>
  deshabilitado?: boolean
}

/** Una fila por denominación con su cantidad y subtotal; billetes y monedas por separado */
export function CuadriculaDenominaciones({ denominaciones, cantidades, registrar, errores, disponibles, deshabilitado }: CuadriculaDenominacionesProps) {
  const grupos = (['Billete', 'Moneda'] as const)
    .map((tipo) => ({ tipo, items: denominaciones.filter((item) => item.tipoPieza === tipo) }))
    .filter((grupo) => grupo.items.length > 0)

  return (
    <div className="flex flex-col gap-5">
      {grupos.map(({ tipo, items }) => {
        const Icono = tipo === 'Billete' ? Banknote : Coins
        return (
          <fieldset key={tipo} disabled={deshabilitado} className="min-w-0">
            <legend className="mb-2 flex items-center gap-2 text-sm font-semibold text-heading">
              <Icono aria-hidden className="size-4 text-muted-foreground" />
              {tipo === 'Billete' ? 'Billetes' : 'Monedas'}
            </legend>
            <ul className="divide-y divide-border rounded-2xl border border-border">
              {items.map((denominacion) => {
                const clave = claveDenominacion(denominacion.idDenominacion)
                const id = `cantidad-${clave}`
                const cantidad = leerCantidad(cantidades[clave])
                const disponible = disponibles?.get(denominacion.idDenominacion)
                const noAlcanza = disponibles !== undefined && cantidad !== null && cantidad > (disponible ?? 0)
                const error = errores?.[clave] ?? (noAlcanza ? `Solo hay ${formatearCantidad(disponible ?? 0)}.` : undefined)
                const subtotal = cantidad ? cantidad * denominacion.valor : 0
                return (
                  <li key={denominacion.idDenominacion} className="flex flex-col gap-1 px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <label htmlFor={id} className="w-14 shrink-0 text-[15px] font-semibold text-heading tabular-nums">
                        {etiquetaValor(denominacion.valor)}
                      </label>
                      <Input
                        id={id}
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="0"
                        maxLength={13}
                        aria-invalid={!!error}
                        aria-describedby={error ? `${id}-error` : disponibles ? `${id}-disponible` : undefined}
                        className="h-10 w-28 rounded-lg border-border bg-field text-right text-base tabular-nums md:text-base dark:bg-field"
                        {...registrar(denominacion.idDenominacion)}
                      />
                      {disponibles && (
                        <span id={`${id}-disponible`} className="hidden text-xs text-muted-foreground sm:inline">
                          de {formatearCantidad(disponible ?? 0)}
                        </span>
                      )}
                      <span className={cn('ml-auto text-sm tabular-nums', subtotal > 0 ? 'font-medium text-heading' : 'text-muted-foreground')}>
                        {formatearMonto(subtotal)}
                      </span>
                    </div>
                    {error && (
                      <p id={`${id}-error`} className="pl-[68px] text-xs text-destructive">
                        {error}
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          </fieldset>
        )
      })}
    </div>
  )
}
