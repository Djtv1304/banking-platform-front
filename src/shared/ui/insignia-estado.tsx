import type { ReactNode } from 'react'
import { CircleCheck, CircleX, Info, Minus, TriangleAlert } from 'lucide-react'

import { cn } from '@/shared/lib'
import { Badge } from '@/shared/ui/badge'

export type TonoInsignia = 'exito' | 'advertencia' | 'peligro' | 'neutro' | 'info'

/**
 * El texto va siempre con el color de lectura del tema (alto contraste en claro y oscuro): el tono se marca con el
 * fondo, el borde y un icono distinto por tono, así que el significado nunca depende sólo del color.
 */
const TONOS: Record<TonoInsignia, { clase: string; icono: ReactNode }> = {
  exito: { clase: 'border-primary/40 bg-primary/15 text-heading', icono: <CircleCheck /> },
  advertencia: { clase: 'border-link/60 bg-transparent text-heading', icono: <TriangleAlert className="text-link" /> },
  peligro: { clase: 'border-destructive/50 bg-destructive/10 text-heading', icono: <CircleX className="text-destructive" /> },
  info: { clase: 'border-info/60 bg-info/15 text-heading', icono: <Info /> },
  neutro: { clase: 'border-border bg-muted text-muted-foreground', icono: <Minus /> },
}

export interface InsigniaEstadoProps {
  tono: TonoInsignia
  /** Texto del estado (Activa, Bloqueada, Pendiente…): siempre visible */
  children: ReactNode
  /** Sustituye el icono del tono; `null` lo quita */
  icono?: ReactNode
  className?: string
}

/** Estado de negocio de un registro, con texto visible y un tono (E0-07) */
export function InsigniaEstado({ tono, children, icono, className }: InsigniaEstadoProps) {
  const { clase, icono: porDefecto } = TONOS[tono]
  return (
    <Badge data-tono={tono} className={cn('h-6 px-2.5', clase, className)}>
      {icono === undefined ? <span aria-hidden className="contents">{porDefecto}</span> : icono && <span aria-hidden className="contents">{icono}</span>}
      {children}
    </Badge>
  )
}
