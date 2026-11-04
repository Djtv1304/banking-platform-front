/** Atributos de accesibilidad para un campo con posible error (el mensaje usa el id `${id}-error`) */
export const a11y = (id: string, error?: string) => ({
  'aria-invalid': !!error,
  'aria-describedby': error ? `${id}-error` : undefined,
})
