import { CircleHelp, ExternalLink } from 'lucide-react'

export function HelpCenterCard() {
  return (
    // Al tener la URL real del Centro de ayuda: añadir target="_blank" rel="noreferrer"
    <a
      href="#"
      className="group flex items-center gap-3 rounded-3xl border border-transparent bg-card px-6 py-5 text-base text-foreground transition-colors dark:border-border"
    >
      <CircleHelp className="size-5 shrink-0 text-muted-foreground" />
      <span className="flex-1">
        ¿Tienes alguna duda?{' '}
        <span className="font-semibold text-link group-hover:underline">
          Visita nuestro Centro de ayuda
        </span>
      </span>
      <ExternalLink className="size-[18px] shrink-0 text-muted-foreground" />
    </a>
  )
}
