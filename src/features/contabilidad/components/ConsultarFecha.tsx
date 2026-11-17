import { useState, type FormEvent } from 'react'

import { toApiError } from '@/shared/api'
import { Button, FechaInput } from '@/shared/ui'
import { ResultadoConsultaFecha } from '@/features/contabilidad/components/ResultadoConsultaFecha'
import { useFechaContable } from '@/features/contabilidad/hooks/useFechaContable'
import { esFechaIsoValida } from '@/features/contabilidad/lib/asientos'
import { mensajeErrorFechaContable } from '@/features/contabilidad/lib/fecha-contable'

const campoClassName = 'h-[52px] rounded-xl border-border bg-field px-4 text-base md:text-base placeholder:text-muted-foreground/80 dark:bg-field'

const MENSAJE_FECHA_INCOMPLETA = 'Escribe una fecha válida: día, mes y año.'

/** «Consultar una fecha»: día, mes y año con el helper de fechas; la consulta se lanza al enviar */
export function ConsultarFecha() {
  const [borrador, setBorrador] = useState('')
  const [consultada, setConsultada] = useState<string | null>(null)
  const [errorLocal, setErrorLocal] = useState<string>()
  const consulta = useFechaContable(consultada)

  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    if (!esFechaIsoValida(borrador)) {
      setErrorLocal(MENSAJE_FECHA_INCOMPLETA)
      return
    }
    setErrorLocal(undefined)
    // Misma fecha otra vez: se vuelve a preguntar (p. ej. tras generarse el calendario)
    if (borrador === consultada) void consulta.refetch()
    else setConsultada(borrador)
  }

  const cambiar = (valor: string) => {
    setBorrador(valor)
    setErrorLocal(undefined)
  }

  // El 400 del backend se pega al campo mientras no se cambie la fecha consultada
  const error400 =
    consulta.isError && consultada === borrador && toApiError(consulta.error).status === 400
      ? mensajeErrorFechaContable(toApiError(consulta.error))
      : undefined
  const errorCampo = errorLocal ?? error400

  return (
    <section aria-labelledby="consultar-fecha-titulo" className="rounded-3xl border border-border bg-card p-6 sm:p-8">
      <h2 id="consultar-fecha-titulo" className="text-lg font-semibold text-heading">Consultar una fecha</h2>
      <p className="mt-1 mb-5 text-sm text-muted-foreground">Revisa si una fecha está en el calendario contable y si se puede operar en ella.</p>
      <form onSubmit={enviar} noValidate aria-label="Consultar una fecha" className="flex flex-col gap-5">
        <div className="flex min-w-0 flex-col gap-2.5">
          <FechaInput
            id="fecha-consulta"
            label="Fecha a consultar"
            value={borrador}
            onChange={cambiar}
            onBlur={() => {}}
            inputClassName={campoClassName}
            invalid={!!errorCampo}
            errorId={errorCampo ? 'fecha-consulta-error' : undefined}
          />
          {errorCampo && <p id="fecha-consulta-error" className="text-sm text-destructive">{errorCampo}</p>}
        </div>
        <div>
          <Button type="submit" disabled={consulta.isFetching} className="h-[52px] rounded-xl px-6 text-base">
            Consultar
          </Button>
        </div>
      </form>
      <div aria-live="polite" className="mt-5">
        {consultada && <ResultadoConsultaFecha consulta={consulta} />}
      </div>
    </section>
  )
}
