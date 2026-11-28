import type { ReactNode, RefObject } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui'

export function DialogoFicha({ titulo, descripcion, ocupado = false, disparador, cerrar, children }: {
  titulo: string
  descripcion: string
  ocupado?: boolean
  disparador: RefObject<HTMLButtonElement | null>
  cerrar: () => void
  children: ReactNode
}) {
  return (
    <Dialog open onOpenChange={abierto => { if (!abierto && !ocupado) cerrar() }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-5 sm:p-6 md:max-w-2xl"
        showCloseButton={!ocupado} onInteractOutside={evento => evento.preventDefault()}
        onCloseAutoFocus={evento => { evento.preventDefault(); disparador.current?.focus() }}>
        <DialogHeader className="pr-8">
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
