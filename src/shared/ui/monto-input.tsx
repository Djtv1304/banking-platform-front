import type { ComponentProps } from 'react'

import { cn } from '@/shared/lib'
import { centavosDeTexto, formatearCentavos, soloCaracteresDeMonto } from '@/shared/lib/monto'
import { Input } from '@/shared/ui/input'

type Props = Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'type' | 'inputMode' | 'children'> & {
  value: string
  onChange: (texto: string) => void
}

/**
 * Monto en dólares con dos decimales (es-EC: «1.234,50»). Guarda el texto tal como se escribe y,
 * al salir del campo, lo deja con el formato completo si es válido; si no, lo deja como está
 * para que quien lo escribió vea el error y lo corrija.
 */
export function MontoInput({ value, onChange, onBlur, className, ...props }: Props) {
  return (
    <div className="relative">
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
        $
      </span>
      <Input
        {...props}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        maxLength={24}
        value={value}
        className={cn('pl-7 text-right tabular-nums', className)}
        onChange={event => onChange(soloCaracteresDeMonto(event.target.value))}
        onBlur={event => {
          const centavos = centavosDeTexto(value)
          if (centavos !== null) onChange(formatearCentavos(centavos))
          onBlur?.(event)
        }}
      />
    </div>
  )
}
