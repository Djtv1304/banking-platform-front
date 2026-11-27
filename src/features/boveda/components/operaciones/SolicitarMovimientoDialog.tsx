import { useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowDownLeft, ArrowUpRight, LoaderCircle, Send, ShieldCheck, TriangleAlert } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { cn } from '@/shared/lib'
import { Button } from '@/shared/ui'
import { useAgencias, useDenominaciones } from '@/features/catalogos'
import { mensajeErrorOperacion } from '@/features/boveda/api/bovedas.api'
import {
  OBSERVACIONES_SOLICITUD_MAX,
  TIPOS_SOLICITUD,
  type Boveda,
  type CrearSolicitudMovimiento,
  type SolicitudMovimiento,
} from '@/features/boveda/api/bovedas.contract'
import { Campo } from '@/features/boveda/components/Campo'
import { CuadriculaDenominaciones } from '@/features/boveda/components/operaciones/CuadriculaDenominaciones'
import { DialogoOperacion, ErrorOperacion } from '@/features/boveda/components/operaciones/DialogoOperacion'
import { useCrearSolicitudMovimiento, useDestinosBoveda } from '@/features/boveda/hooks/useBovedas'
import { ariaCampo, selectClassName, textareaClassName } from '@/features/boveda/lib/campos'
import {
  etiquetaMovimiento,
  formatearMonto,
  nivelSaldo,
  nombreAgencia,
  textoNivel,
  valoresPorDenominacion,
} from '@/features/boveda/lib/formato'
import {
  armarDesglose,
  claveDenominacion,
  claveParaEnvio,
  MOVIMIENTO_VACIO,
  movimientoFormSchema,
  NATURALEZA_MOVIMIENTO,
  pideContraparte,
  piezasInsuficientes,
  saldoResultante,
  totalDesglose,
  type MovimientoForm,
} from '@/features/boveda/lib/operaciones'

interface SolicitarMovimientoDialogProps {
  boveda: Boveda
  open: boolean
  onCerrar: () => void
  onCreada: (solicitud: SolicitudMovimiento) => void
}

export function SolicitarMovimientoDialog({ boveda, open, onCerrar, onCreada }: SolicitarMovimientoDialogProps) {
  const registro = useCrearSolicitudMovimiento(boveda.idBoveda)
  const ultimoEnvio = useRef<{ firma: string; clave: string } | null>(null)
  const catalogo = useDenominaciones()
  const agencias = useAgencias()
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<MovimientoForm, unknown, CrearSolicitudMovimiento>({
    resolver: zodResolver(movimientoFormSchema(boveda.idBoveda)),
    defaultValues: MOVIMIENTO_VACIO,
  })
  const tipo = useWatch({ control, name: 'tipoMovimiento' })
  const cantidades = useWatch({ control, name: 'cantidades' }) ?? {}
  const traslado = pideContraparte(tipo)
  const bovedas = useDestinosBoveda(boveda.idBoveda, open && traslado)
  const contrapartes = bovedas.data ?? []

  const pendiente = registro.isPending
  const naturaleza = tipo ? NATURALEZA_MOVIMIENTO[tipo] : null
  const valores = valoresPorDenominacion(catalogo.data, boveda.denominaciones)
  const desglose = armarDesglose(cantidades)
  const total = totalDesglose(desglose, valores)
  const saldoDespues = naturaleza ? saldoResultante(boveda.saldoActual, total, naturaleza) : boveda.saldoActual
  const faltan = naturaleza === 'E' ? piezasInsuficientes(desglose, boveda.denominaciones) : []
  const disponibles = naturaleza === 'E' ? new Map(boveda.denominaciones.map((item) => [item.idDenominacion, item.cantidadActual])) : undefined
  const limitesDespues = { ...boveda, saldoActual: saldoDespues }
  const errorPiezas = (errors.cantidades as { message?: string } | undefined)?.message
  const erroresPiezas = Object.fromEntries(
    Object.entries(errors.cantidades ?? {}).flatMap(([clave, error]) =>
      error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? [[clave, error.message]] : [],
    ),
  )

  const cerrar = () => {
    if (pendiente) return
    reset(MOVIMIENTO_VACIO)
    registro.reset()
    ultimoEnvio.current = null
    onCerrar()
  }

  const enviar = async (solicitud: CrearSolicitudMovimiento) => {
    const envio = claveParaEnvio(ultimoEnvio.current, solicitud)
    ultimoEnvio.current = envio
    try {
      const creada = await registro.mutateAsync({ solicitud, clave: envio.clave })
      reset(MOVIMIENTO_VACIO)
      registro.reset()
      ultimoEnvio.current = null
      onCreada(creada)
    } catch (error) {
      for (const { field, message } of toApiError(error).fields) {
        const campo = field.split('.').pop() ?? field
        if (field.includes('desglose') || campo === 'cantidad' || campo === 'idDenominacion') setError('cantidades', { message })
        else if (campo === 'tipoMovimiento' || campo === 'idBovedaContraparte' || campo === 'observaciones') {
          setError(campo, { message }, { shouldFocus: true })
        }
      }
    }
  }

  return (
    <DialogoOperacion
      open={open}
      ocupado={pendiente}
      onCerrar={cerrar}
      ancho="amplio"
      titulo="Solicitar movimiento"
      descripcion={`Efectivo que entrará o saldrá de ${boveda.codigoBoveda}. Saldo actual: ${formatearMonto(boveda.saldoActual)}.`}
      pie={
        <>
          <div className="mr-auto flex min-w-0 flex-col gap-0.5 text-sm" aria-live="polite">
            <span className="text-muted-foreground">
              Total <span className="ml-1 text-lg font-bold text-heading tabular-nums">{formatearMonto(total)}</span>
            </span>
            {naturaleza && total > 0 && (
              <span className={cn('tabular-nums', nivelSaldo(limitesDespues) === 'normal' ? 'text-muted-foreground' : 'font-medium text-destructive')}>
                Saldo estimado después del movimiento {formatearMonto(saldoDespues)}
                {nivelSaldo(limitesDespues) !== 'normal' && ` · ${textoNivel(limitesDespues).toLowerCase()}`}
              </span>
            )}
          </div>
          <Button type="button" variant="outline" disabled={pendiente} onClick={cerrar} className="min-h-11 rounded-xl px-6">
            Cancelar
          </Button>
          <Button type="submit" form="form-movimiento" disabled={pendiente || (traslado && contrapartes.length === 0)} className="min-h-11 rounded-xl px-6 font-semibold">
            {pendiente ? <LoaderCircle className="animate-spin" /> : <Send />}
            {pendiente ? 'Enviando…' : 'Enviar solicitud'}
          </Button>
        </>
      }
    >
      <form
        id="form-movimiento"
        onSubmit={(event) => void handleSubmit(enviar)(event)}
        noValidate
        aria-busy={pendiente}
        className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"
      >
        <fieldset disabled={pendiente} className="flex min-w-0 flex-col gap-6">
          <legend className="sr-only">Datos del movimiento</legend>
          <Campo
            id="mov-tipo-registro"
            label="Tipo de movimiento"
            error={errors.tipoMovimiento?.message}
            ayuda={
              naturaleza && (
                <span className="flex items-center gap-1.5">
                  {naturaleza === 'I' ? <ArrowDownLeft aria-hidden className="size-4" /> : <ArrowUpRight aria-hidden className="size-4" />}
                  {naturaleza === 'I' ? `Entra efectivo a ${boveda.codigoBoveda}.` : `Sale efectivo de ${boveda.codigoBoveda}.`}
                </span>
              )
            }
          >
            <select
              id="mov-tipo-registro"
              className={selectClassName}
              {...ariaCampo('mov-tipo-registro', errors.tipoMovimiento?.message, !!naturaleza)}
              {...register('tipoMovimiento')}
            >
              <option value="">Elige el tipo</option>
              {TIPOS_SOLICITUD.map((item) => (
                <option key={item} value={item}>{etiquetaMovimiento(item)}</option>
              ))}
            </select>
          </Campo>

          {traslado && (
            <Campo
              id="mov-contraparte"
              label="Bóveda que recibe"
              error={errors.idBovedaContraparte?.message}
              ayuda={bovedas.isError ? 'No pudimos cargar las bóvedas de destino.' : undefined}
            >
              <select
                id="mov-contraparte"
                className={selectClassName}
                disabled={contrapartes.length === 0}
                {...ariaCampo('mov-contraparte', errors.idBovedaContraparte?.message, true)}
                {...register('idBovedaContraparte')}
              >
                <option value="">
                  {bovedas.isFetching ? 'Cargando bóvedas…' : contrapartes.length ? 'Elige la bóveda' : 'Sin destinos disponibles'}
                </option>
                {contrapartes.map((item) => (
                  <option key={item.idBoveda} value={String(item.idBoveda)}>
                    {item.codigoBoveda} · {nombreAgencia(item.idAgencia, agencias.data)}
                  </option>
                ))}
              </select>
            </Campo>
          )}

          <Campo id="mov-observaciones" label="Observaciones (opcional)" error={errors.observaciones?.message}>
            <textarea
              id="mov-observaciones"
              rows={3}
              maxLength={OBSERVACIONES_SOLICITUD_MAX}
              className={textareaClassName}
              {...ariaCampo('mov-observaciones', errors.observaciones?.message)}
              {...register('observaciones')}
            />
          </Campo>
          <div className="flex items-start gap-3 rounded-2xl border border-info/60 bg-info/15 p-4 text-sm text-foreground">
            <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-heading" />
            <p>
              El jefe de la agencia debe aprobar desde su sesión. El saldo cambia al confirmar el movimiento físico.
            </p>
          </div>
        </fieldset>

        <section aria-labelledby="mov-piezas" className="flex min-w-0 flex-col gap-4">
          <header className="flex flex-col gap-1">
            <h3 id="mov-piezas" className="text-[15px] font-semibold text-heading">
              Piezas que se mueven
            </h3>
            <p className="text-sm text-muted-foreground">
              {naturaleza === 'E' ? 'Junto a cada cantidad ves cuántas piezas hay en la bóveda.' : 'Cantidad de billetes y monedas por denominación.'}
            </p>
          </header>
          {catalogo.isError ? (
            <ErrorOperacion>No pudimos cargar las denominaciones. Cierra y vuelve a intentarlo.</ErrorOperacion>
          ) : (
            <CuadriculaDenominaciones
              denominaciones={catalogo.data}
              cantidades={cantidades}
              registrar={(id) => register(`cantidades.${claveDenominacion(id)}`)}
              errores={erroresPiezas}
              disponibles={disponibles}
              deshabilitado={pendiente}
            />
          )}
          {errorPiezas && <p className="text-sm text-destructive">{errorPiezas}</p>}
          {faltan.length > 0 && (
            <p role="note" className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
              La bóveda no tiene suficientes piezas en {faltan.length === 1 ? 'una denominación' : `${faltan.length} denominaciones`}. Revisa las
              cantidades marcadas.
            </p>
          )}
        </section>
      </form>

      {registro.isError && (
        <div className="mt-6">
          <ErrorOperacion>{mensajeErrorOperacion(registro.error, 'solicitar movimientos de bóveda', true)}</ErrorOperacion>
        </div>
      )}
    </DialogoOperacion>
  )
}
