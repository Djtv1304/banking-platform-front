import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'

import { toApiError } from '@/shared/api'
import {
  Aviso,
  Button,
  Cargando,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@/shared/ui'
import type { Confirmacion } from '@/features/catalogos/api/catalogos.contract'
import { Campo, inputClassName } from '@/features/catalogos/components/CampoCatalogo'
import { useCodigoConfirmacion } from '@/features/catalogos/hooks/useCatalogos'
import { mensajeErrorCatalogo } from '@/features/catalogos/lib/mensajes'

interface ConfirmacionDialogProps {
  clave: string
  abierto: boolean
  /** Qué se va a hacer, para el título (p. ej. «Crear canal») */
  accion: string
  onCancelar: () => void
  onConfirmado: (confirmacion: Confirmacion) => void
}

/**
 * Advertencia y código de 4 caracteres para cambios que pueden alterar la lógica de negocio.
 * El backend emite el código y lo verifica al recibir la operación; aquí solo se muestra y se
 * pide escribirlo.
 */
export function ConfirmacionDialog({ clave, abierto, accion, onCancelar, onConfirmado }: ConfirmacionDialogProps) {
  return (
    <Dialog open={abierto} onOpenChange={(a) => !a && onCancelar()}>
      <DialogContent className="gap-5 p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-heading">
            <ShieldAlert className="size-5 text-destructive" aria-hidden />
            {accion}
          </DialogTitle>
          <DialogDescription>Confirma el cambio con el código que aparece abajo.</DialogDescription>
        </DialogHeader>
        {abierto && <Contenido clave={clave} onCancelar={onCancelar} onConfirmado={onConfirmado} />}
      </DialogContent>
    </Dialog>
  )
}

function Contenido({ clave, onCancelar, onConfirmado }: Omit<ConfirmacionDialogProps, 'abierto' | 'accion'>) {
  const emitido = useCodigoConfirmacion(clave, true)
  const [codigo, setCodigo] = useState('')

  if (emitido.isError) return <Aviso tono="error">{mensajeErrorCatalogo(toApiError(emitido.error))}</Aviso>
  if (emitido.isPending) return <Cargando texto="Generando código…" />

  const listo = codigo.trim().length === emitido.data.codigo.length
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (listo) onConfirmado({ token: emitido.data.token, codigo: codigo.trim().toUpperCase() })
      }}
    >
      <Aviso tono="error">{emitido.data.advertencia}</Aviso>
      <p className="text-center font-mono text-4xl font-bold tracking-[0.5em] text-heading select-none" aria-label={`Código ${emitido.data.codigo.split('').join(' ')}`}>
        {emitido.data.codigo}
      </p>
      <Campo id="confirmacion-codigo" label="Ingresa el código" ayuda="Vence en 5 minutos.">
        <Input
          id="confirmacion-codigo"
          autoComplete="off"
          autoFocus
          maxLength={emitido.data.codigo.length}
          className={`${inputClassName} text-center font-mono text-xl tracking-[0.4em] uppercase`}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
        />
      </Campo>
      <DialogFooter className="-mx-6 -mb-6 px-6">
        <Button type="button" variant="outline" size="lg" onClick={onCancelar} className="rounded-lg px-4">
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={!listo} className="rounded-lg px-4 font-semibold">
          Continuar
        </Button>
      </DialogFooter>
    </form>
  )
}
