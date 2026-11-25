import { useState } from 'react'

import { Aviso, Button } from '@/shared/ui'
import type { Tarjeta } from '@/features/tarjetas/api/tarjetas.contract'
import { CambiarEstadoTarjetaDialog } from '@/features/tarjetas/components/CambiarEstadoTarjetaDialog'
import {
  type AccionEstado,
  type AccionTarjeta,
  accionesEstado,
  esIrreversible,
} from '@/features/tarjetas/lib/acciones-tarjeta'

interface AccionesTarjetaProps {
  tarjeta: Tarjeta
  permisos: Record<AccionTarjeta, boolean> & { resolverSolicitud?: boolean; desbloquear?: boolean }
}

/** TAR-04 · Cambios de estado que admite la tarjeta, según su estado y los permisos del usuario */
export function AccionesTarjeta({ tarjeta, permisos }: AccionesTarjetaProps) {
  const [accion, setAccion] = useState<AccionEstado | null>(null)
  const [confirmacion, setConfirmacion] = useState<string | null>(null)

  if (!permisos.estado) return null

  const generada = tarjeta.estadoActual === 'Generada'
  const bloqueada = tarjeta.estadoActual === 'Bloqueada'
  const requiereReposicion = ['ROBO', 'PERDIDA'].includes(tarjeta.motivoEstado ?? '')
  const acciones = accionesEstado(tarjeta.estadoActual).filter(({ destino }) => {
    if (destino === 'Aprobada' || destino === 'Anulada') return permisos.resolverSolicitud
    if (destino === 'Activa' && generada) {
      return tarjeta.tipoTarjeta === 'Debito' && Boolean(tarjeta.sobreDescargadoEn)
        && (!tarjeta.envio || tarjeta.envio.estadoEnvio === 'Despachado')
    }
    return destino !== 'Activa' || !bloqueada || (permisos.desbloquear && !requiereReposicion)
  })

  const abrir = (siguiente: AccionEstado) => {
    setConfirmacion(null)
    setAccion(siguiente)
  }

  return (
    <section aria-labelledby="acciones-tarjeta" className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-6 sm:p-8">
      <header className="flex flex-col gap-1">
        <h2 id="acciones-tarjeta" className="text-lg font-semibold text-heading">
          Acciones
        </h2>
        <p className="text-sm text-muted-foreground">
          Cada cambio pide un motivo y queda en el historial de la tarjeta.
        </p>
      </header>

      {confirmacion && <Aviso>{confirmacion}</Aviso>}

      {acciones.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {acciones.map((siguiente) => (
            <Button
              key={siguiente.destino}
              type="button"
              size="lg"
              variant={esIrreversible(siguiente.destino) || siguiente.destino === 'Bloqueada' ? 'destructive' : 'outline'}
              onClick={() => abrir(siguiente)}
              className="rounded-lg px-4"
            >
              {siguiente.etiqueta}
            </Button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          En estado {tarjeta.estadoActual} la tarjeta ya no admite cambios de estado.
        </p>
      )}
      {generada && tarjeta.tipoTarjeta === 'Debito' && !tarjeta.sobreDescargadoEn && (
        <p className="text-sm text-muted-foreground">
          Descarga el sobre de PIN para confirmar la entrega.
        </p>
      )}
      {bloqueada && requiereReposicion && <Aviso>La tarjeta debe reponerse por pérdida o robo.</Aviso>}

      <CambiarEstadoTarjetaDialog
        tarjeta={tarjeta}
        accion={accion}
        onCerrar={() => setAccion(null)}
        onCambiado={(mensaje) => {
          setAccion(null)
          setConfirmacion(mensaje)
        }}
      />
    </section>
  )
}
