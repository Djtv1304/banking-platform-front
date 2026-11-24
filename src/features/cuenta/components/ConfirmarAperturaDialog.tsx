import { LoaderCircle, TriangleAlert, WalletCards } from 'lucide-react'

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui'

interface ConfirmarAperturaDialogProps {
  abierto: boolean
  resumen: readonly { label: string; valor: string }[]
  enviando: boolean
  onConfirmar: () => void
  onCancelar: () => void
  /** Tras un error, el foco va al campo o al aviso que lo explica en vez de volver al botón */
  onCloseAutoFocus: (event: Event) => void
}

/** La apertura no se puede deshacer: el asesor revisa el resumen antes de enviarla */
export function ConfirmarAperturaDialog({
  abierto,
  resumen,
  enviando,
  onConfirmar,
  onCancelar,
  onCloseAutoFocus,
}: ConfirmarAperturaDialogProps) {
  return (
    <Dialog open={abierto} onOpenChange={(abrir) => !abrir && !enviando && onCancelar()}>
      <DialogContent showCloseButton={!enviando} onCloseAutoFocus={onCloseAutoFocus} className="gap-5 p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-heading">Confirma la apertura de la cuenta</DialogTitle>
          <DialogDescription>Revisa los datos antes de abrirla.</DialogDescription>
        </DialogHeader>

        <dl className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border text-sm sm:grid-cols-2">
          {resumen.map(({ label, valor }) => (
            <div key={label} className="flex flex-col gap-0.5 bg-field px-4 py-3">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="font-medium break-words text-heading">{valor}</dd>
            </div>
          ))}
        </dl>

        <p className="flex gap-2 rounded-xl border border-brand-amber/40 bg-brand-amber/10 px-4 py-3 text-sm text-heading">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-link" />
          La cuenta se abre con saldo cero y queda pendiente del primer depósito.
        </p>

        <DialogFooter className="-mx-6 -mb-6 px-6">
          <Button type="button" variant="outline" size="lg" disabled={enviando} onClick={onCancelar} className="rounded-lg px-4">
            Revisar datos
          </Button>
          <Button type="button" size="lg" disabled={enviando} onClick={onConfirmar} className="rounded-lg px-4 font-semibold">
            {enviando ? <LoaderCircle className="animate-spin" /> : <WalletCards />}
            Abrir cuenta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
