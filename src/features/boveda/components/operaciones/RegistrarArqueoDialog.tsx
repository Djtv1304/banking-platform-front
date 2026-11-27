import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { cn } from '@/shared/lib'
import { Button, Input } from '@/shared/ui'
import { useDenominaciones } from '@/features/catalogos'
import { mensajeErrorOperacion } from '@/features/boveda/api/bovedas.api'
import { OBSERVACIONES_MAX, TIPOS_ARQUEO, type Arqueo, type RegistrarArqueo } from '@/features/boveda/api/bovedas.contract'
import { Campo } from '@/features/boveda/components/Campo'
import { CuadriculaDenominaciones } from '@/features/boveda/components/operaciones/CuadriculaDenominaciones'
import { DialogoOperacion, ErrorOperacion } from '@/features/boveda/components/operaciones/DialogoOperacion'
import { ResumenArqueo } from '@/features/boveda/components/operaciones/ResumenArqueo'
import { useRegistrarArqueo } from '@/features/boveda/hooks/useBovedas'
import { ariaCampo, campoClassName, textareaClassName } from '@/features/boveda/lib/campos'
import { formatearMonto, valoresPorDenominacion } from '@/features/boveda/lib/formato'
import {
  ARQUEO_VACIO,
  arqueoFormSchema,
  armarDesglose,
  claveDenominacion,
  DESCRIPCION_ARQUEO,
  erroresPorDenominacion,
  totalDesglose,
  type ArqueoForm,
} from '@/features/boveda/lib/operaciones'

interface RegistrarArqueoDialogProps {
  idBoveda: number
  codigoBoveda: string
  open: boolean
  onCerrar: () => void
  onRegistrado: (arqueo: Arqueo) => void
}

/**
 * BOV-05 · Conteo físico de la bóveda. Es un conteo a ciegas: no se muestra lo que el sistema espera
 * para que el conteo sea independiente. La diferencia llega en la respuesta.
 */
export function RegistrarArqueoDialog({ idBoveda, codigoBoveda, open, onCerrar, onRegistrado }: RegistrarArqueoDialogProps) {
  const registro = useRegistrarArqueo(idBoveda)
  const catalogo = useDenominaciones()
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ArqueoForm, unknown, RegistrarArqueo>({ resolver: zodResolver(arqueoFormSchema), defaultValues: ARQUEO_VACIO })
  const cantidades = useWatch({ control, name: 'cantidades' }) ?? {}
  const tipoElegido = useWatch({ control, name: 'tipoArqueo' })
  const pendiente = registro.isPending
  const resultado = registro.data
  const valores = valoresPorDenominacion(catalogo.data)
  const contado = totalDesglose(armarDesglose(cantidades), valores)
  const errorPiezas = (errors.cantidades as { message?: string } | undefined)?.message
  const erroresPiezas = erroresPorDenominacion(errors.cantidades)

  const cerrar = () => {
    if (pendiente) return
    reset(ARQUEO_VACIO)
    registro.reset()
    onCerrar()
  }

  const enviar = async (arqueo: RegistrarArqueo) => {
    try {
      onRegistrado(await registro.mutateAsync(arqueo))
    } catch (error) {
      for (const { field, message } of toApiError(error).fields) {
        const campo = field.split('.').pop() ?? field
        if (field.includes('desglose') || campo === 'cantidad' || campo === 'idDenominacion') setError('cantidades', { message })
        else if (campo === 'tipoArqueo' || campo === 'idUsuarioResponsable' || campo === 'observaciones') setError(campo, { message }, { shouldFocus: true })
      }
    }
  }

  if (resultado) {
    return (
      <DialogoOperacion
        open={open}
        ocupado={false}
        onCerrar={cerrar}
        titulo="Arqueo cerrado"
        descripcion="Resultado del conteo físico."
        pie={<Button type="button" onClick={cerrar} className="min-h-11 rounded-xl px-6">Listo</Button>}
      >
        <ResumenArqueo arqueo={resultado} valores={valores} />
      </DialogoOperacion>
    )
  }

  return (
    <DialogoOperacion
      open={open}
      ocupado={pendiente}
      onCerrar={cerrar}
      ancho="amplio"
      titulo="Cerrar arqueo"
      descripcion={`Registra el conteo físico de ${codigoBoveda}. Al cerrar, el saldo se ajusta a lo contado.`}
      pie={
        <>
          <p className="mr-auto text-sm text-muted-foreground" aria-live="polite">
            Total contado <span className="ml-1 text-lg font-bold text-heading tabular-nums">{formatearMonto(contado)}</span>
          </p>
          <Button type="button" variant="outline" disabled={pendiente} onClick={cerrar} className="min-h-11 rounded-xl px-6">
            Cancelar
          </Button>
          <Button type="submit" form="form-arqueo" disabled={pendiente || !catalogo.isSuccess} className="min-h-11 rounded-xl px-6 font-semibold">
            {pendiente && <LoaderCircle className="animate-spin" />}
            {pendiente ? 'Cerrando…' : contado === 0 ? `Cerrar con ${formatearMonto(0)}` : 'Cerrar arqueo'}
          </Button>
        </>
      }
    >
      <form
        id="form-arqueo"
        onSubmit={handleSubmit(enviar)}
        noValidate
        aria-busy={pendiente}
        className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"
      >
        <fieldset disabled={pendiente} className="flex min-w-0 flex-col gap-6">
          <legend className="sr-only">Datos del arqueo</legend>

          <fieldset className="min-w-0">
            <legend className="mb-2.5 text-[15px] font-semibold text-heading">Tipo de arqueo</legend>
            <div className="divide-y divide-border rounded-2xl border border-border">
              {TIPOS_ARQUEO.map((tipo) => {
                const marcado = tipoElegido === tipo
                return (
                  <label
                    key={tipo}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 px-4 py-3.5 transition-colors first:rounded-t-2xl last:rounded-b-2xl has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-inset',
                      marcado ? 'bg-primary/10' : 'hover:bg-muted/60',
                    )}
                  >
                    <input type="radio" value={tipo} className="mt-1 size-4 accent-primary" {...register('tipoArqueo')} />
                    <span className="flex flex-col gap-0.5">
                      <span className={cn('text-[15px] text-heading', marcado && 'font-semibold')}>{tipo}</span>
                      <span className="text-sm text-muted-foreground">{DESCRIPCION_ARQUEO[tipo]}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <Campo id="arqueo-responsable" label="Cajero responsable" error={errors.idUsuarioResponsable?.message}
            ayuda="Si hay faltante, ingresa el número de usuario interno del cajero de la agencia."
          >
            <Input id="arqueo-responsable" inputMode="numeric" autoComplete="off" maxLength={10}
              className={campoClassName}
              {...ariaCampo('arqueo-responsable', errors.idUsuarioResponsable?.message, true)}
              {...register('idUsuarioResponsable')}
            />
          </Campo>

          <Campo id="arqueo-observaciones" label="Observaciones (opcional)" error={errors.observaciones?.message}>
            <textarea
              id="arqueo-observaciones"
              rows={3}
              maxLength={OBSERVACIONES_MAX}
              placeholder="Ej.: Arqueo de cierre de mes"
              className={textareaClassName}
              {...ariaCampo('arqueo-observaciones', errors.observaciones?.message)}
              {...register('observaciones')}
            />
          </Campo>
        </fieldset>

        <section aria-labelledby="arqueo-piezas" className="flex min-w-0 flex-col gap-4">
          <header className="flex flex-col gap-1">
            <h3 id="arqueo-piezas" className="text-[15px] font-semibold text-heading">
              Conteo físico
            </h3>
            <p className="text-sm text-muted-foreground">Deja en blanco las denominaciones que no contaste.</p>
          </header>
          {catalogo.isError ? (
            <ErrorOperacion>No pudimos cargar las denominaciones. Cierra y vuelve a intentarlo.</ErrorOperacion>
          ) : (
            <CuadriculaDenominaciones
              denominaciones={catalogo.data}
              cantidades={cantidades}
              registrar={(id) => register(`cantidades.${claveDenominacion(id)}`)}
              errores={erroresPiezas}
              deshabilitado={pendiente}
            />
          )}
          {errorPiezas && <p className="text-sm text-destructive">{errorPiezas}</p>}
        </section>
      </form>

      {registro.isError && (
        <div className="mt-6">
          <ErrorOperacion>{mensajeErrorOperacion(registro.error, 'registrar arqueos')}</ErrorOperacion>
        </div>
      )}
    </DialogoOperacion>
  )
}
