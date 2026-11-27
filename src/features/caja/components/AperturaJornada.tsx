import { useState, type FormEvent } from 'react'
import { DoorOpen, RefreshCw } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { cn } from '@/shared/lib'
import { Aviso, Button, Cargando, Label, Textarea } from '@/shared/ui'
import { mensajeErrorCaja } from '@/features/caja/api/caja.api'
import { useAbrirJornada, useCajasFisicas } from '@/features/caja/hooks/useCaja'
import { formatearMonto, nombreVentanilla } from '@/features/caja/lib/formato'

const selectClassName =
  'h-[52px] w-full rounded-xl border border-border bg-field px-4 text-base text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive dark:scheme-dark'

const OBSERVACION_MAXIMA = 500

/**
 * CAJ-03 · El cajero elige una ventanilla activa de su agencia y abre su jornada. La jornada abre en 0
 * (historia E7-02): el efectivo entra después con la dotación desde la bóveda.
 */
export function AperturaJornada() {
  const cajas = useCajasFisicas(true)
  const abrir = useAbrirJornada()
  const [idCaja, setIdCaja] = useState('')
  const [observacion, setObservacion] = useState('')
  const [faltaCaja, setFaltaCaja] = useState(false)

  const errorApi = abrir.isError ? toApiError(abrir.error) : null
  const errorObservacion =
    observacion.trim().length > OBSERVACION_MAXIMA
      ? `Máximo ${OBSERVACION_MAXIMA} caracteres.`
      : errorApi?.fields.find((campo) => campo.field.endsWith('observacion'))?.message

  const enviar = (event: FormEvent) => {
    event.preventDefault()
    if (abrir.isPending) return
    if (idCaja === '') {
      setFaltaCaja(true)
      return
    }
    if (errorObservacion) return
    const texto = observacion.trim()
    abrir.mutate({ idCajaFisica: Number(idCaja), dineroInicial: 0, ...(texto ? { observacion: texto } : {}) })
  }

  const selector = (() => {
    if (cajas.isPending) return <Cargando texto="Cargando las ventanillas…" />
    if (cajas.isError) {
      return (
        <Aviso tono="error">
          {mensajeErrorCaja(cajas.error, 'consultar las ventanillas')}
          <Button type="button" variant="outline" size="sm" disabled={cajas.isFetching} onClick={() => void cajas.refetch()} className="w-fit">
            <RefreshCw className={cn(cajas.isFetching && 'animate-spin')} />
            Reintentar
          </Button>
        </Aviso>
      )
    }
    const activas = cajas.data.filter((caja) => caja.estado !== false)
    if (activas.length === 0) return <Aviso>No hay ventanillas activas en tu agencia. Pide a tu supervisor que active una.</Aviso>
    return (
      <div className="flex flex-col gap-2.5">
        <Label htmlFor="apertura-ventanilla" className="text-[15px] font-semibold text-heading">
          Ventanilla
        </Label>
        <select
          id="apertura-ventanilla"
          value={idCaja}
          aria-invalid={faltaCaja}
          aria-describedby={faltaCaja ? 'apertura-ventanilla-error' : 'apertura-ventanilla-ayuda'}
          onChange={(event) => {
            setIdCaja(event.target.value)
            setFaltaCaja(false)
            abrir.reset()
          }}
          className={selectClassName}
        >
          <option value="">Elige una ventanilla</option>
          {activas.map((caja) => (
            <option key={caja.idCajaFisica} value={caja.idCajaFisica}>
              {nombreVentanilla(caja)}
              {caja.limiteEfectivoCaja != null ? ` · límite ${formatearMonto(caja.limiteEfectivoCaja)}` : ''}
            </option>
          ))}
        </select>
        {faltaCaja ? (
          <p id="apertura-ventanilla-error" className="text-sm text-destructive">
            Elige la ventanilla en la que vas a atender.
          </p>
        ) : (
          <p id="apertura-ventanilla-ayuda" className="text-sm text-muted-foreground">
            Si otra persona ya abrió esa ventanilla, te lo diremos al abrir.
          </p>
        )}
      </div>
    )
  })()

  return (
    <section aria-labelledby="apertura-titulo" className="flex max-w-2xl flex-col gap-5 rounded-2xl border border-border bg-card p-6">
      <div>
        <h2 id="apertura-titulo" className="text-xl font-semibold text-heading">
          Abrir jornada
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          No tienes una jornada abierta. Elige tu ventanilla para empezar: la jornada abre en {formatearMonto(0)} y el efectivo
          llega con la dotación de la bóveda.
        </p>
      </div>

      <form aria-label="Abrir jornada" noValidate onSubmit={enviar} className="flex flex-col gap-5">
        {selector}

        <div className="flex flex-col gap-2.5">
          <Label htmlFor="apertura-observacion" className="text-[15px] font-semibold text-heading">
            Observación <span className="font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <Textarea
            id="apertura-observacion"
            value={observacion}
            maxLength={OBSERVACION_MAXIMA}
            aria-invalid={!!errorObservacion}
            aria-describedby={errorObservacion ? 'apertura-observacion-error' : undefined}
            onChange={(event) => {
              setObservacion(event.target.value)
              abrir.reset()
            }}
          />
          {errorObservacion && (
            <p id="apertura-observacion-error" className="text-sm text-destructive">
              {errorObservacion}
            </p>
          )}
        </div>

        {abrir.isError && <Aviso tono="error">{mensajeErrorCaja(abrir.error, 'abrir la jornada', true)}</Aviso>}

        <Button type="submit" disabled={abrir.isPending || cajas.isPending || cajas.isError} className="w-fit">
          <DoorOpen />
          {abrir.isPending ? 'Abriendo…' : 'Abrir jornada'}
        </Button>
      </form>
    </section>
  )
}
