import { useState } from 'react'
import { Link } from 'react-router'

import { toApiError } from '@/shared/api'
import { Aviso, Button, DialogoConfirmacion } from '@/shared/ui'
import { hasAnyRole, useAuthStore, usePuedeFuncion } from '@/features/auth'
import type { Asiento } from '@/features/contabilidad/api/asientos.contract'
import { CONTABILIDAD_ROLES } from '@/features/contabilidad/api/contabilidad.contract'
import { useAnularAsiento, useEnviarAsiento, useSolicitarReverso } from '@/features/contabilidad/hooks/useAsientoManual'
import {
  accionesDeAsiento,
  detalleErroresAsiento,
  esAsientoDeOperacion,
  MENSAJE_ASIENTO_DE_OPERACION,
  mensajeErrorAsientoManual,
} from '@/features/contabilidad/lib/asiento-manual'

type Dialogo = 'anular' | 'reversar' | null
type Resultado = { tono: 'info' | 'error'; mensaje: string; detalle?: string[] }

/** E4-04 · Acciones del detalle: editar, enviar a aprobación y anular un borrador; solicitar el reverso de un manual contabilizado */
export function AccionesAsiento({ asiento }: { asiento: Asiento }) {
  const roles = useAuthStore((estado) => estado.user?.roles)
  const puedeCrear = usePuedeFuncion('contabilidad.asientos.crear', hasAnyRole(roles ?? [], CONTABILIDAD_ROLES.asientosManuales))
  const puedeReversar = usePuedeFuncion('contabilidad.asientos.reversar', hasAnyRole(roles ?? [], CONTABILIDAD_ROLES.reversos))
  // El asiento sigue CONTABILIZADO hasta que aprueben el reverso: tras pedirlo no se ofrece otra vez
  const [reversoSolicitado, setReversoSolicitado] = useState(false)
  const permitidas = accionesDeAsiento(asiento, { puedeCrear, puedeReversar })
  const acciones = { ...permitidas, reversar: permitidas.reversar && !reversoSolicitado }

  const enviar = useEnviarAsiento()
  const anular = useAnularAsiento()
  const reversar = useSolicitarReverso()
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const procesando = enviar.isPending || anular.isPending || reversar.isPending

  const fallo = (error: unknown, accion: 'enviar' | 'anular' | 'reversar') => {
    const apiError = toApiError(error)
    setResultado({ tono: 'error', mensaje: mensajeErrorAsientoManual(apiError, accion), detalle: detalleErroresAsiento(apiError) })
  }
  const exito = (mensaje: string) => setResultado({ tono: 'info', mensaje })

  const alEnviar = () => {
    setResultado(null)
    enviar.mutate(asiento.idAsientoContable, {
      onSuccess: ({ pendiente }) =>
        exito(pendiente ? 'Asiento enviado a aprobación. Otra persona lo aprueba en Aprobaciones.' : 'Asiento contabilizado.'),
      onError: (error) => fallo(error, 'enviar'),
    })
  }

  const alAnular = (motivo?: string) => {
    setResultado(null)
    anular.mutate(
      { idAsiento: asiento.idAsientoContable, motivo: motivo ?? '' },
      {
        onSuccess: () => {
          setDialogo(null)
          exito('Borrador anulado.')
        },
        onError: (error) => {
          setDialogo(null)
          fallo(error, 'anular')
        },
      },
    )
  }

  const alReversar = (motivo?: string) => {
    setResultado(null)
    reversar.mutate(
      { idAsiento: asiento.idAsientoContable, motivo: motivo ?? '' },
      {
        onSuccess: ({ pendiente }) => {
          setDialogo(null)
          setReversoSolicitado(true)
          exito(
            pendiente
              ? 'Reverso solicitado. Queda pendiente hasta que otra persona lo apruebe en Aprobaciones.'
              : 'Reverso registrado.',
          )
        },
        onError: (error) => {
          setDialogo(null)
          fallo(error, 'reversar')
        },
      },
    )
  }

  const hayAcciones = acciones.editar || acciones.enviar || acciones.anular || acciones.reversar
  const nota = puedeReversar && esAsientoDeOperacion(asiento)
  if (!hayAcciones && !nota && !resultado) return null

  return (
    <section aria-label="Acciones del asiento" className="flex flex-col gap-3 border-t border-border pt-4">
      {nota && <Aviso>{MENSAJE_ASIENTO_DE_OPERACION}</Aviso>}

      {resultado && (
        <Aviso tono={resultado.tono}>
          <p>{resultado.mensaje}</p>
          {resultado.detalle && resultado.detalle.length > 0 && (
            <ul className="list-disc pl-5">
              {resultado.detalle.map((linea) => (
                <li key={linea}>{linea}</li>
              ))}
            </ul>
          )}
        </Aviso>
      )}

      {hayAcciones && (
        <div className="flex flex-wrap gap-2">
          {acciones.editar && (
            <Button asChild variant="outline" size="sm">
              <Link to={`/contabilidad/asientos/${asiento.idAsientoContable}/editar`}>Editar borrador</Link>
            </Button>
          )}
          {acciones.enviar && (
            <Button size="sm" onClick={alEnviar} disabled={procesando}>
              {enviar.isPending ? 'Enviando…' : 'Enviar a aprobación'}
            </Button>
          )}
          {acciones.anular && (
            <Button variant="outline" size="sm" onClick={() => setDialogo('anular')} disabled={procesando}>
              Anular borrador
            </Button>
          )}
          {acciones.reversar && (
            <Button variant="outline" size="sm" onClick={() => setDialogo('reversar')} disabled={procesando}>
              Solicitar reverso
            </Button>
          )}
        </div>
      )}

      <DialogoConfirmacion
        abierto={dialogo === 'anular'}
        onAbiertoChange={(abierto) => !abierto && setDialogo(null)}
        titulo="Anular borrador"
        descripcion={`El borrador ${asiento.numeroAsiento} quedará anulado y ya no se podrá editar ni enviar.`}
        textoConfirmar="Anular borrador"
        destructiva
        motivo={{ obligatorio: true, etiqueta: 'Motivo de la anulación' }}
        onConfirmar={alAnular}
        procesando={anular.isPending}
      />
      <DialogoConfirmacion
        abierto={dialogo === 'reversar'}
        onAbiertoChange={(abierto) => !abierto && setDialogo(null)}
        titulo="Solicitar reverso"
        descripcion={`Se pedirá un asiento que deje sin efecto el ${asiento.numeroAsiento}. Otra persona debe aprobarlo en Aprobaciones.`}
        textoConfirmar="Solicitar reverso"
        motivo={{ obligatorio: true, etiqueta: 'Motivo del reverso' }}
        onConfirmar={alReversar}
        procesando={reversar.isPending}
      />
    </section>
  )
}
