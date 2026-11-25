import { useState, type ReactNode } from 'react'
import { Download, KeyRound, LoaderCircle } from 'lucide-react'

import { toApiError } from '@/shared/api'
import {
  Aviso,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui'
import type { Tarjeta } from '@/features/tarjetas/api/tarjetas.contract'
import { useDescargarSobrePin, useRegenerarPin } from '@/features/tarjetas/hooks/useAccionesTarjeta'
import {
  type AccionTarjeta,
  admiteRegenerarPin,
  admiteSobrePin,
  formatearFechaHora,
  mensajeErrorAccionTarjeta,
} from '@/features/tarjetas/lib/acciones-tarjeta'

interface PinTarjetaProps {
  tarjeta: Tarjeta
  permisos: Record<AccionTarjeta, boolean>
}

type Dialogo = 'regenerar' | 'sobre' | null

/** TAR-05 y TAR-07 · El PIN lo genera el HSM: aquí solo se pide uno nuevo o se descarga su sobre */
export function PinTarjeta({ tarjeta, permisos }: PinTarjetaProps) {
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const [confirmacion, setConfirmacion] = useState<string | null>(null)

  const regenerar = permisos.pin && admiteRegenerarPin(tarjeta)
  const sobre = permisos.sobrePin && admiteSobrePin(tarjeta) && !tarjeta.sobreDescargadoEn
  if (!regenerar && !sobre) return null

  const abrir = (siguiente: Dialogo) => {
    setConfirmacion(null)
    setDialogo(siguiente)
  }
  const terminar = (mensaje: string) => {
    setDialogo(null)
    setConfirmacion(mensaje)
  }

  return (
    <section aria-labelledby="pin-tarjeta" className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-6 sm:p-8">
      <header className="flex flex-col gap-1">
        <h2 id="pin-tarjeta" className="text-lg font-semibold text-heading">
          PIN
        </h2>
        <p className="text-sm text-muted-foreground">El PIN lo genera el sistema de seguridad y nunca se muestra en pantalla.</p>
      </header>

      {confirmacion && <Aviso>{confirmacion}</Aviso>}

      <div className="flex flex-wrap gap-3">
        {regenerar && (
          <Button type="button" variant="outline" size="lg" onClick={() => abrir('regenerar')} className="rounded-lg px-4">
            <KeyRound />
            Regenerar PIN
          </Button>
        )}
        {sobre && (
          <Button type="button" variant="outline" size="lg" onClick={() => abrir('sobre')} className="rounded-lg px-4">
            <Download />
            Descargar sobre de PIN
          </Button>
        )}
      </div>

      <Dialog open={dialogo !== null} onOpenChange={(abierto) => !abierto && setDialogo(null)}>
        <DialogContent className="gap-5 p-6 sm:max-w-lg">
          {dialogo === 'regenerar' && (
            <RegenerarPin tarjeta={tarjeta} onCancelar={() => setDialogo(null)} onTerminado={terminar} />
          )}
          {dialogo === 'sobre' && (
            <DescargarSobre tarjeta={tarjeta} onCancelar={() => setDialogo(null)} onTerminado={terminar} />
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}

interface PasoProps {
  tarjeta: Tarjeta
  onCancelar: () => void
  onTerminado: (mensaje: string) => void
}

function RegenerarPin({ tarjeta, onCancelar, onTerminado }: PasoProps) {
  const regenerar = useRegenerarPin(tarjeta.idTarjeta)
  const debito = tarjeta.tipoTarjeta === 'Debito'

  const confirmar = () =>
    regenerar.mutate(undefined, {
      onSuccess: () => {
        const base = `El PIN se regeneró el ${formatearFechaHora(new Date())}.`
        onTerminado(debito ? `${base} El sobre de PIN nuevo ya se puede descargar.` : base)
      },
    })

  return (
    <Confirmacion
      titulo={`Regenerar PIN · ${tarjeta.numeroEnmascarado}`}
      descripcion={
        <>
          El sistema genera un PIN nuevo y el anterior deja de servir. Nadie lo ve en pantalla.
          {debito && ' Se genera también un sobre de PIN nuevo para entregarlo al cliente.'}
        </>
      }
      error={regenerar.isError ? mensajeErrorAccionTarjeta(toApiError(regenerar.error), 'pin') : null}
      pendiente={regenerar.isPending}
      etiqueta="Regenerar PIN"
      onCancelar={onCancelar}
      onConfirmar={confirmar}
    />
  )
}

function DescargarSobre({ tarjeta, onCancelar, onTerminado }: PasoProps) {
  const descargar = useDescargarSobrePin(tarjeta.idTarjeta)

  const confirmar = () =>
    descargar.mutate(undefined, {
      onSuccess: () => onTerminado(`Descargaste el sobre de PIN el ${formatearFechaHora(new Date())}.`),
    })

  return (
    <Confirmacion
      titulo={`Sobre de PIN · ${tarjeta.numeroEnmascarado}`}
      descripcion="El sobre solo se puede descargar una vez. Descárgalo cuando vayas a imprimirlo y entrégalo al cliente con la tarjeta."
      error={descargar.isError ? mensajeErrorAccionTarjeta(toApiError(descargar.error), 'sobrePin') : null}
      pendiente={descargar.isPending}
      etiqueta="Descargar sobre"
      onCancelar={onCancelar}
      onConfirmar={confirmar}
    />
  )
}

interface ConfirmacionProps {
  titulo: string
  descripcion: ReactNode
  error: string | null
  pendiente: boolean
  etiqueta: string
  onCancelar: () => void
  onConfirmar: () => void
}

function Confirmacion({ titulo, descripcion, error, pendiente, etiqueta, onCancelar, onConfirmar }: ConfirmacionProps) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold text-heading">{titulo}</DialogTitle>
        <DialogDescription>{descripcion}</DialogDescription>
      </DialogHeader>
      {error && <Aviso tono="error">{error}</Aviso>}
      <DialogFooter className="-mx-6 -mb-6 px-6">
        <Button type="button" variant="outline" size="lg" onClick={onCancelar} className="rounded-lg px-4">
          Volver
        </Button>
        <Button type="button" size="lg" disabled={pendiente} onClick={onConfirmar} className="rounded-lg px-4 font-semibold">
          {pendiente && <LoaderCircle className="animate-spin" />}
          {etiqueta}
        </Button>
      </DialogFooter>
    </>
  )
}
