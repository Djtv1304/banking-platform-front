import { Headset } from 'lucide-react'

import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui'

export function SignupCard() {
  return (
    <div className="rounded-2xl border border-border bg-card px-6 py-5 text-center text-base text-muted-foreground">
      ¿Eres funcionario nuevo?{' '}
      <Dialog>
        <DialogTrigger className="ml-1 rounded-md font-semibold text-link outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">
          Solicita tu acceso
        </DialogTrigger>
        <DialogContent className="gap-6 rounded-3xl border border-border bg-card p-8 sm:max-w-md">
          <DialogHeader className="items-center text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-link">
              <Headset className="size-6" />
            </span>
            <DialogTitle className="mt-2 text-2xl font-bold tracking-tight text-heading">
              Acceso para funcionarios
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed text-muted-foreground">
              Tu usuario lo crea el administrador del sistema de la cooperativa. Pídele que te envíe la invitación a tu
              correo: al aceptarla, eliges tu contraseña.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mx-0 mb-0 rounded-none border-0 bg-transparent p-0 sm:justify-center">
            <DialogClose asChild>
              <Button className="h-12 w-full rounded-xl text-base font-semibold hover:bg-primary/90">Entendido</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
