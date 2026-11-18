import { useState, type FormEvent } from 'react'
import { ArrowLeft, LoaderCircle, ShieldAlert } from 'lucide-react'

import { Button, Input } from '@/shared/ui'
import { useDenominaciones } from '@/features/catalogos'
import { mensajeErrorOperacion } from '@/features/boveda/api/bovedas.api'
import type { Arqueo } from '@/features/boveda/api/bovedas.contract'
import { Campo } from '@/features/boveda/components/Campo'
import { DialogoOperacion, ErrorOperacion } from '@/features/boveda/components/operaciones/DialogoOperacion'
import { ResumenArqueo } from '@/features/boveda/components/operaciones/ResumenArqueo'
import { useAprobarArqueo } from '@/features/boveda/hooks/useBovedas'
import { ariaCampo, campoClassName } from '@/features/boveda/lib/campos'
import { leerIdBoveda } from '@/features/boveda/lib/filtros'
import { valoresPorDenominacion } from '@/features/boveda/lib/formato'
import { textoDiferencia } from '@/features/boveda/lib/operaciones'

/** Palabra que hay que escribir para confirmar */
const PALABRA = 'APROBAR'

type Paso = 'revisar' | 'confirmar'

interface AprobarArqueoDialogProps {
  open: boolean
  /** El arqueo recién registrado; sin él se pide su número (lo registró otra persona) */
  arqueo: Arqueo | null
  onCerrar: () => void
  onAprobado: (arqueo: Arqueo) => void
}

/**
 * BOV-06 · Doble confirmación: primero se revisa el arqueo y lo que implica aprobarlo; después hay
 * que escribir «APROBAR». El botón final solo se habilita con la palabra exacta.
 */
export function AprobarArqueoDialog({ open, arqueo, onCerrar, onAprobado }: AprobarArqueoDialogProps) {
  const aprobacion = useAprobarArqueo()
  const catalogo = useDenominaciones()
  const [paso, setPaso] = useState<Paso>('revisar')
  const [numero, setNumero] = useState('')
  const [errorNumero, setErrorNumero] = useState<string>()
  const [palabra, setPalabra] = useState('')
  const pendiente = aprobacion.isPending
  const resultado = aprobacion.data
  const valores = valoresPorDenominacion(catalogo.data)
  const idArqueo = arqueo?.idArqueoBoveda ?? leerIdBoveda(numero)
  const confirmado = palabra.trim().toUpperCase() === PALABRA

  const cerrar = () => {
    if (pendiente) return
    setPaso('revisar')
    setNumero('')
    setErrorNumero(undefined)
    setPalabra('')
    aprobacion.reset()
    onCerrar()
  }

  const continuar = (event: FormEvent) => {
    event.preventDefault()
    if (idArqueo === null) return setErrorNumero('Escribe el número del arqueo, por ejemplo 15.')
    aprobacion.reset()
    setPaso('confirmar')
  }

  const aprobar = async (event: FormEvent) => {
    event.preventDefault()
    if (!confirmado || idArqueo === null) return
    try {
      onAprobado(await aprobacion.mutateAsync(idArqueo))
    } catch {
      /* El error se muestra en el diálogo */
    }
  }

  if (resultado) {
    return (
      <DialogoOperacion
        open={open}
        ocupado={false}
        onCerrar={cerrar}
        titulo="Arqueo aprobado"
        descripcion="Los ajustes ya están registrados y el saldo de la bóveda refleja lo contado."
        pie={
          <Button type="button" onClick={cerrar} className="min-h-11 rounded-xl px-6 font-semibold">
            Listo
          </Button>
        }
      >
        <ResumenArqueo arqueo={resultado} valores={valores} />
      </DialogoOperacion>
    )
  }

  const consecuencias = (
    <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-foreground">
      <li>Se registran los movimientos de ajuste por la diferencia y el saldo de la bóveda cambia.</li>
      <li>El arqueo queda cerrado como aprobado.</li>
      <li>No hay una opción para revertir la aprobación desde esta pantalla.</li>
    </ul>
  )

  if (paso === 'revisar') {
    return (
      <DialogoOperacion
        open={open}
        ocupado={false}
        onCerrar={cerrar}
        titulo="Aprobar arqueo"
        descripcion={arqueo ? 'Revisa el resultado antes de continuar.' : 'Indica qué arqueo vas a aprobar y revisa lo que implica.'}
        pie={
          <>
            <Button type="button" variant="outline" onClick={cerrar} className="min-h-11 rounded-xl px-6">
              Cancelar
            </Button>
            <Button type="submit" form="form-revisar-arqueo" className="min-h-11 rounded-xl px-6 font-semibold">
              Continuar
            </Button>
          </>
        }
      >
        <form id="form-revisar-arqueo" onSubmit={continuar} noValidate className="flex flex-col gap-6">
          {arqueo ? (
            <ResumenArqueo arqueo={arqueo} valores={valores} />
          ) : (
            <Campo id="arqueo-numero" label="N.º de arqueo" error={errorNumero} ayuda="Lo ves al registrar el arqueo.">
              <Input
                id="arqueo-numero"
                inputMode="numeric"
                autoComplete="off"
                maxLength={10}
                placeholder="Ej.: 15"
                value={numero}
                onChange={(event) => {
                  setNumero(event.target.value)
                  setErrorNumero(undefined)
                }}
                className={campoClassName}
                {...ariaCampo('arqueo-numero', errorNumero, true)}
              />
            </Campo>
          )}
          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-field p-5">
            <p className="text-sm font-semibold text-heading">Al aprobar</p>
            {consecuencias}
          </div>
        </form>
      </DialogoOperacion>
    )
  }

  return (
    <DialogoOperacion
      open={open}
      ocupado={pendiente}
      onCerrar={cerrar}
      titulo={`¿Aprobar el arqueo N.º ${idArqueo}?`}
      descripcion={arqueo ? `${textoDiferencia(arqueo)}. Esta es la última confirmación.` : 'Esta es la última confirmación.'}
      pie={
        <>
          <Button type="button" variant="outline" disabled={pendiente} onClick={() => setPaso('revisar')} className="mr-auto min-h-11 rounded-xl px-4">
            <ArrowLeft />
            Volver
          </Button>
          <Button type="button" variant="outline" disabled={pendiente} onClick={cerrar} className="min-h-11 rounded-xl px-6">
            Cancelar
          </Button>
          <Button
            type="submit"
            form="form-aprobar-arqueo"
            variant="destructive"
            disabled={pendiente || !confirmado}
            className="min-h-11 rounded-xl px-6 font-semibold"
          >
            {pendiente && <LoaderCircle className="animate-spin" />}
            {pendiente ? 'Aprobando…' : 'Aprobar y generar ajustes'}
          </Button>
        </>
      }
    >
      <form id="form-aprobar-arqueo" onSubmit={aprobar} noValidate aria-busy={pendiente} className="flex flex-col gap-6">
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-5">
          <ShieldAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-destructive" />
          {consecuencias}
        </div>
        <Campo id="arqueo-confirmacion" label={`Escribe ${PALABRA} para confirmar`}>
          <Input
            id="arqueo-confirmacion"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={PALABRA.length + 4}
            value={palabra}
            disabled={pendiente}
            onChange={(event) => setPalabra(event.target.value)}
            className={`${campoClassName} tracking-[0.2em] uppercase`}
          />
        </Campo>
        {aprobacion.isError && <ErrorOperacion>{mensajeErrorOperacion(aprobacion.error, 'aprobar arqueos')}</ErrorOperacion>}
      </form>
    </DialogoOperacion>
  )
}
