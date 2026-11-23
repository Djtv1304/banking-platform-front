import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

export interface ConsultaCatalogo<T> {
  data?: readonly T[]
  isLoading: boolean
  isError: boolean
  refetch?: () => unknown
}

export interface SelectorCatalogoProps<T> {
  /** Texto del label visible; se enlaza con el selector por `htmlFor` e `id` */
  etiqueta: string
  id: string
  /** Lo que devuelve un hook de catálogo (`useAgencias()`, `usePaises()`…) */
  consulta: ConsultaCatalogo<T>
  /** Cómo se muestra cada elemento del catálogo: su valor y su texto */
  opcion: (item: T) => { valor: string; etiqueta: string }
  valor?: string
  onCambiar: (valor: string) => void
  placeholder?: string
  disabled?: boolean
  /** Marca el campo con `aria-invalid` */
  invalido?: boolean
  /** Id del elemento que explica el error (`aria-describedby`) */
  descripcionError?: string
}

const CLASE_SELECTOR =
  'w-full rounded-xl border-border bg-field px-4 text-base data-[size=default]:h-[52px] dark:bg-field dark:hover:bg-field'

/**
 * Lista desplegable alimentada por un catálogo (E0-07). Cubre los estados de la consulta: cargando (deshabilitado con
 * «Cargando…»), error (mensaje y «Reintentar» si hay `refetch`) y sin datos («Sin opciones»).
 *
 * La caché por sesión NO la da este componente sino el hook del catálogo (`POR_SESION`, con `staleTime` y `gcTime`
 * infinitos en `features/catalogos`): cada catálogo se pide una vez y todos los selectores comparten el resultado.
 *
 * Con React Hook Form se usa con `Controller`: `valor={field.value}` y `onCambiar={field.onChange}`.
 */
export function SelectorCatalogo<T>({
  etiqueta,
  id,
  consulta,
  opcion,
  valor,
  onCambiar,
  placeholder = 'Selecciona una opción',
  disabled,
  invalido,
  descripcionError,
}: SelectorCatalogoProps<T>) {
  const opciones = (consulta.data ?? []).map(opcion)
  const cargando = consulta.isLoading
  const error = !cargando && consulta.isError
  const sinOpciones = !cargando && !error && opciones.length === 0
  const idError = `${id}-catalogo-error`
  const describedBy = [descripcionError, error ? idError : undefined].filter(Boolean).join(' ') || undefined

  const textoMarcador = cargando ? 'Cargando…' : error ? 'No se pudo cargar' : sinOpciones ? 'Sin opciones' : placeholder

  return (
    <div className="flex flex-col gap-2.5">
      <Label htmlFor={id} className="text-[15px] font-semibold text-heading">
        {etiqueta}
      </Label>
      <Select value={valor ?? ''} onValueChange={onCambiar} disabled={disabled || cargando || error || sinOpciones}>
        <SelectTrigger
          id={id}
          className={CLASE_SELECTOR}
          aria-invalid={invalido || undefined}
          aria-describedby={describedBy}
          aria-busy={cargando || undefined}
        >
          <SelectValue placeholder={textoMarcador} />
        </SelectTrigger>
        <SelectContent>
          {opciones.map((o) => (
            <SelectItem key={o.valor} value={o.valor}>
              {o.etiqueta}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <div id={idError} role="alert" className="flex flex-wrap items-center gap-2 text-sm text-destructive">
          <span>No pudimos cargar las opciones de «{etiqueta}».</span>
          {consulta.refetch && (
            <Button type="button" variant="outline" size="sm" onClick={() => void consulta.refetch?.()}>
              Reintentar
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
