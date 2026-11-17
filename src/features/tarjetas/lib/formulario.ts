import { cn } from '@/shared/lib'
import type { Cliente } from '@/features/tarjetas/api/tarjetas.contract'

/** Razón social (persona jurídica) o nombres y apellidos (persona natural) */
export const nombreCliente = (cliente: Cliente) =>
  cliente.razonSocial ?? [cliente.nombres, cliente.apellidos].filter(Boolean).join(' ')

/** Atributos de accesibilidad para un campo con posible error (el mensaje usa el id `${id}-error`) */
export const a11y = (id: string, error?: string) => ({
  'aria-invalid': !!error,
  'aria-describedby': error ? `${id}-error` : undefined,
})

/** Tarjeta-opción seleccionable de un radiogroup (cuentas, tipos, subproductos) */
export const opcionClassName = cn(
  'flex cursor-pointer items-center gap-4 rounded-xl border border-border bg-field px-4 py-3 transition-colors',
  'hover:border-primary/50 has-checked:border-primary has-checked:bg-primary/8',
  'has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
  'has-disabled:cursor-not-allowed has-disabled:opacity-60 has-disabled:hover:border-border',
)

/** Texto largo (motivos) con el mismo estilo que los campos */
export const textareaClassName = cn(
  'min-h-28 w-full resize-y rounded-xl border border-border bg-field px-4 py-3 text-base text-foreground outline-none',
  'placeholder:text-muted-foreground/80 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
  'aria-invalid:border-destructive dark:bg-field',
)

/**
 * CTA-02 devuelve el estado de la cuenta en mayúsculas (`ACTIVA`); se compara sin distinguir
 * mayúsculas para no depender de cómo lo escriba cada versión del backend.
 */
export const cuentaAdmiteTarjeta = (estado: string) => estado.trim().toUpperCase() === 'ACTIVA'
