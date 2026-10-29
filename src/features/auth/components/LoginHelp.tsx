import { ArrowRight, ChevronDown } from 'lucide-react'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui'

const HELP_OPTIONS = [
  'Desbloquear mi usuario',
  'No recibo mi código de seguridad',
  'Contactar a un asesor',
]

export function LoginHelp() {
  return (
    <Collapsible className="flex flex-col items-center gap-5">
      <CollapsibleTrigger className="group flex items-center gap-2 rounded-md text-base font-medium text-link outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">
        ¿Tienes problemas para ingresar?
        <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="w-full data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {HELP_OPTIONS.map((option) => (
            <li key={option}>
              <a
                href="#"
                className="flex items-center justify-between gap-4 px-6 py-4 text-base text-foreground transition-colors hover:bg-muted"
              >
                {option}
                <ArrowRight className="size-[18px] shrink-0 text-muted-foreground" />
              </a>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}
