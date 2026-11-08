import { Nfc } from 'lucide-react'

import { cn } from '@/shared/lib'
import type { TipoTarjeta } from '@/features/tarjetas/api/tarjetas.contract'

interface VistaPreviaTarjetaProps {
  tipoTarjeta: TipoTarjeta
  nombre: string
  producto?: string
  extension: boolean
}

/** Referencia visual: el número real lo genera el backend y nunca se muestra completo */
export function VistaPreviaTarjeta({ tipoTarjeta, nombre, producto, extension }: VistaPreviaTarjetaProps) {
  const credito = tipoTarjeta === 'Credito'

  return (
    <figure
      aria-label="Vista previa de la tarjeta"
      className={cn(
        'relative flex aspect-[1.586] flex-col justify-between overflow-hidden rounded-2xl p-5 text-white shadow-lg',
        credito ? 'bg-gradient-to-br from-slate-800 to-slate-950' : 'bg-gradient-to-br from-primary to-brand-ink',
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-sm font-semibold tracking-wide">{credito ? 'CRÉDITO' : 'DÉBITO'}</span>
        <Nfc className="size-6 opacity-80" />
      </div>
      <div className="flex flex-col gap-3">
        <span className="font-mono text-lg tracking-[0.2em] opacity-90">•••• •••• •••• ••••</span>
        <div className="flex items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <span className="text-[10px] uppercase opacity-70">{extension ? 'Adicional' : 'Titular'}</span>
            <span className="truncate text-sm font-semibold tracking-wide uppercase">
              {nombre.trim() || 'NOMBRE DEL CLIENTE'}
            </span>
          </div>
          <span className="shrink-0 text-right text-[10px] leading-tight opacity-80">{producto ?? 'Producto'}</span>
        </div>
      </div>
    </figure>
  )
}
