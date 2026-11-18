import { useRef } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowDownLeft, ArrowUpRight, LoaderCircle, TriangleAlert } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { cn } from '@/shared/lib'
import { Button, Input } from '@/shared/ui'
import { useDenominaciones } from '@/features/catalogos'
import { mensajeErrorOperacion } from '@/features/boveda/api/bovedas.api'
import { OBSERVACIONES_MAX, type Boveda, type RegistrarMovimiento } from '@/features/boveda/api/bovedas.contract'
import { Campo } from '@/features/boveda/components/Campo'
import { CuadriculaDenominaciones } from '@/features/boveda/components/operaciones/CuadriculaDenominaciones'
import { DialogoOperacion, ErrorOperacion } from '@/features/boveda/components/operaciones/DialogoOperacion'
import { SelectorUsuario } from '@/features/boveda/components/operaciones/SelectorUsuario'
import { useBovedas, useRegistrarMovimiento } from '@/features/boveda/hooks/useBovedas'
import { ariaCampo, campoClassName, selectClassName, textareaClassName } from '@/features/boveda/lib/campos'
import {
  etiquetaMovimiento,
  formatearMonto,
  nivelSaldo,
  textoNivel,
  valoresPorDenominacion,
} from '@/features/boveda/lib/formato'
import {
  armarDesglose,
  claveDenominacion,
  claveParaEnvio,
  GRUPOS_MOVIMIENTO,
  MOVIMIENTO_VACIO,
  movimientoFormSchema,
  NATURALEZA_MOVIMIENTO,
  pideContraparte,
  piezasInsuficientes,
  saldoResultante,
  totalDesglose,
  type MovimientoForm,
} from '@/features/boveda/lib/operaciones'

const SIN_FILTROS = {}

interface RegistrarMovimientoDialogProps {
  boveda: Boveda
  open: boolean
  /** Puede listar bóvedas (BOV-01): ofrece las contrapartes de un traslado */
  puedeListar: boolean
  onCerrar: () => void
  onRegistrado: (mensaje: string) => void
}

/** BOV-04 · Traslados, provisiones, dotaciones, devoluciones, ATM y ajustes con su desglose */
export function RegistrarMovimientoDialog({ boveda, open, puedeListar, onCerrar, onRegistrado }: RegistrarMovimientoDialogProps) {
  const registro = useRegistrarMovimiento(boveda.idBoveda)
  const ultimoEnvio = useRef<{ firma: string; clave: string } | null>(null)
  const catalogo = useDenominaciones()
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<MovimientoForm, unknown, RegistrarMovimiento>({
    resolver: zodResolver(movimientoFormSchema(boveda.idBoveda)),
    defaultValues: MOVIMIENTO_VACIO,
  })
  const tipo = useWatch({ control, name: 'tipoMovimiento' })
  const cantidades = useWatch({ control, name: 'cantidades' }) ?? {}
  const traslado = pideContraparte(tipo)
  const bovedas = useBovedas(SIN_FILTROS, open && traslado && puedeListar)
  const contrapartes = (bovedas.data ?? []).filter((item) => item.idBoveda !== boveda.idBoveda)

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

  const enviar = async (movimiento: RegistrarMovimiento) => {
    const envio = claveParaEnvio(ultimoEnvio.current, movimiento)
    ultimoEnvio.current = envio
    try {
      const registrados = await registro.mutateAsync({ movimiento, clave: envio.clave })
      const propio = registrados.find((item) => item.idBoveda === boveda.idBoveda) ?? registrados[0]
      reset(MOVIMIENTO_VACIO)
      registro.reset()
      ultimoEnvio.current = null
      onRegistrado(
        `Registramos ${etiquetaMovimiento(propio.tipoMovimiento).toLowerCase()} por ${formatearMonto(propio.monto)}. ` +
          `El saldo de ${boveda.codigoBoveda} quedó en ${formatearMonto(propio.idBoveda === boveda.idBoveda ? propio.saldoPosterior : saldoDespues)}.`,
      )
    } catch (error) {
      for (const { field, message } of toApiError(error).fields) {
        const campo = field.split('.').pop() ?? field
        if (field.includes('desglose') || campo === 'cantidad' || campo === 'idDenominacion') setError('cantidades', { message })
        else if (campo === 'tipoMovimiento' || campo === 'idBovedaContraparte' || campo === 'autorizadoPor' || campo === 'observaciones') {
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
      titulo="Registrar movimiento"
      descripcion={`Efectivo que entra o sale de ${boveda.codigoBoveda}. Saldo actual: ${formatearMonto(boveda.saldoActual)}.`}
      pie={
        <>
          <div className="mr-auto flex min-w-0 flex-col gap-0.5 text-sm" aria-live="polite">
            <span className="text-muted-foreground">
              Total <span className="ml-1 text-lg font-bold text-heading tabular-nums">{formatearMonto(total)}</span>
            </span>
            {naturaleza && total > 0 && (
              <span className={cn('tabular-nums', nivelSaldo(limitesDespues) === 'normal' ? 'text-muted-foreground' : 'font-medium text-destructive')}>
                Saldo después: {formatearMonto(saldoDespues)}
                {nivelSaldo(limitesDespues) !== 'normal' && ` · ${textoNivel(limitesDespues).toLowerCase()}`}
              </span>
            )}
          </div>
          <Button type="button" variant="outline" disabled={pendiente} onClick={cerrar} className="min-h-11 rounded-xl px-6">
            Cancelar
          </Button>
          <Button type="submit" form="form-movimiento" disabled={pendiente} className="min-h-11 rounded-xl px-6 font-semibold">
            {pendiente && <LoaderCircle className="animate-spin" />}
            {pendiente ? 'Registrando…' : 'Registrar movimiento'}
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
              {GRUPOS_MOVIMIENTO.map((grupo) => (
                <optgroup key={grupo.titulo} label={grupo.titulo}>
                  {grupo.tipos.map((item) => (
                    <option key={item} value={item}>
                      {etiquetaMovimiento(item)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Campo>

          {traslado && (
            <Campo
              id="mov-contraparte"
              label="Bóveda que recibe"
              error={errors.idBovedaContraparte?.message}
              ayuda={contrapartes.length === 0 ? 'Escribe el ID de la bóveda que recibe el efectivo.' : undefined}
            >
              {contrapartes.length > 0 ? (
                <select
                  id="mov-contraparte"
                  className={selectClassName}
                  {...ariaCampo('mov-contraparte', errors.idBovedaContraparte?.message)}
                  {...register('idBovedaContraparte')}
                >
                  <option value="">Elige la bóveda</option>
                  {contrapartes.map((item) => (
                    <option key={item.idBoveda} value={String(item.idBoveda)}>
                      {item.codigoBoveda} · {item.tipoBoveda}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id="mov-contraparte"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={10}
                  placeholder={bovedas.isFetching ? 'Cargando bóvedas…' : 'Ej.: 2'}
                  className={campoClassName}
                  {...ariaCampo('mov-contraparte', errors.idBovedaContraparte?.message, true)}
                  {...register('idBovedaContraparte')}
                />
              )}
            </Campo>
          )}

          <Campo id="mov-autoriza" label="Autorizado por" error={errors.autorizadoPor?.message}>
            <Controller
              control={control}
              name="autorizadoPor"
              render={({ field }) => (
                <SelectorUsuario
                  id="mov-autoriza"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.autorizadoPor?.message}
                  disabled={pendiente}
                />
              )}
            />
          </Campo>

          <Campo id="mov-observaciones" label="Observaciones (opcional)" error={errors.observaciones?.message}>
            <textarea
              id="mov-observaciones"
              rows={3}
              maxLength={OBSERVACIONES_MAX}
              placeholder="Ej.: Dotación de apertura de la caja 3"
              className={textareaClassName}
              {...ariaCampo('mov-observaciones', errors.observaciones?.message)}
              {...register('observaciones')}
            />
          </Campo>
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
          <ErrorOperacion>{mensajeErrorOperacion(registro.error, 'registrar movimientos de bóveda', true)}</ErrorOperacion>
        </div>
      )}
    </DialogoOperacion>
  )
}
