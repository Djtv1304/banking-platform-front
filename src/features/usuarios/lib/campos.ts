import { cn } from '@/shared/lib'

/* Mismo estilo de campo que los formularios de clientes, cuentas y tarjetas; los selects son nativos */
export const campoClassName =
  'h-[52px] rounded-xl border-border bg-field px-4 text-base md:text-base placeholder:text-muted-foreground/80 dark:bg-field'

export const selectClassName = cn(
  campoClassName,
  'w-full border text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive dark:scheme-dark',
)

/** `aria-*` de un campo según tenga error o ayuda (los ids los pinta `Campo`) */
export const ariaCampo = (id: string, error?: string, ayuda?: string) => ({
  'aria-invalid': !!error,
  'aria-describedby': error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined,
})
