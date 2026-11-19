import type { ReactNode } from 'react'
import { Inbox, LoaderCircle, LockKeyhole } from 'lucide-react'

import { ErrorApi } from '@/shared/ui/error-api'
import { cn } from '@/shared/lib'

export type EstadoDePantalla = 'cargando' | 'vacio' | 'error' | 'sin-permiso'

export interface EstadoPantallaProps {
  estado: EstadoDePantalla
  /** Sustituye el título por defecto del estado */
  titulo?: string
  /** Sustituye la descripción por defecto (en `error` va sobre el mensaje de la API) */
  descripcion?: string
  /** Acción propuesta al usuario: un botón o un enlace */
  accion?: ReactNode
  /** Sólo en `error`: lo que lanzó la consulta; se muestra su mensaje y su código de soporte, nunca la traza */
  error?: unknown
  /** Sólo en `error`: vuelve a lanzar la consulta */
  reintentar?: () => void
  className?: string
}

const TEXTOS: Record<Exclude<EstadoDePantalla, 'error'>, { titulo: string; descripcion?: string }> = {
  cargando: { titulo: 'Cargando información…' },
  vacio: { titulo: 'No hay nada para mostrar', descripcion: 'Cuando haya información, aparecerá aquí.' },
  'sin-permiso': {
    titulo: 'No tienes acceso a esta sección',
    descripcion: 'Tu perfil no incluye este permiso. Si lo necesitas, pídelo a quien administra los accesos.',
  },
}

/**
 * Estados de una pantalla o de un bloque: carga, vacío, error y sin permiso (E0-07).
 * Cada uno lleva icono y texto, de modo que el significado no depende del color.
 */
export function EstadoPantalla({ estado, titulo, descripcion, accion, error, reintentar, className }: EstadoPantallaProps) {
  if (estado === 'error') {
    return (
      <div className={cn('flex flex-col gap-3', className)}>
        {titulo && <p className="text-sm font-semibold text-heading">{titulo}</p>}
        {descripcion && <p className="text-sm text-muted-foreground">{descripcion}</p>}
        <ErrorApi error={error} reintentar={reintentar} />
        {accion}
      </div>
    )
  }

  const textos = TEXTOS[estado]
  const Icono = estado === 'cargando' ? LoaderCircle : estado === 'vacio' ? Inbox : LockKeyhole
  const aviso = estado === 'cargando' ? ({ role: 'status', 'aria-live': 'polite', 'aria-busy': true } as const) : {}

  return (
    <div
      {...aviso}
      className={cn('mx-auto flex w-full max-w-xl flex-col items-center gap-2 rounded-2xl border border-border bg-card p-8 text-center', className)}
    >
      <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-link">
        <Icono className={cn('size-6', estado === 'cargando' && 'animate-spin')} />
      </span>
      <p className="mt-2 text-sm font-semibold text-heading">{titulo ?? textos.titulo}</p>
      {(descripcion ?? textos.descripcion) && <p className="text-sm text-muted-foreground">{descripcion ?? textos.descripcion}</p>}
      {accion && <div className="mt-3">{accion}</div>}
    </div>
  )
}
