import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import { z } from 'zod'

import { toApiError } from '@/shared/api'
import { Button, Input } from '@/shared/ui'
import { useDenominaciones } from '@/features/catalogos'
import { mensajeErrorOperacion } from '@/features/boveda/api/bovedas.api'
import { OBSERVACIONES_MAX, REFERENCIA_NOVEDAD_MAX, TIPOS_RESOLUCION_NOVEDAD, type Arqueo } from '@/features/boveda/api/bovedas.contract'
import { Campo } from '@/features/boveda/components/Campo'
import { CuadriculaDenominaciones } from '@/features/boveda/components/operaciones/CuadriculaDenominaciones'
import { DialogoOperacion, ErrorOperacion } from '@/features/boveda/components/operaciones/DialogoOperacion'
import { NovedadArqueo } from '@/features/boveda/components/operaciones/NovedadArqueo'
import { useResolverNovedadArqueo } from '@/features/boveda/hooks/useBovedas'
import { ariaCampo, campoClassName, selectClassName, textareaClassName } from '@/features/boveda/lib/campos'
import { formatearMonto, valoresPorDenominacion } from '@/features/boveda/lib/formato'
import {
  armarDesglose, cantidadesSchema, claveDenominacion, erroresPorDenominacion, ETIQUETAS_RESOLUCION_NOVEDAD,
  totalDesglose, validarCantidades,
} from '@/features/boveda/lib/operaciones'

const formulario = z.object({
  tipoResolucion: z.enum(TIPOS_RESOLUCION_NOVEDAD),
  observaciones: z.string().trim().min(1, 'Describe cómo se resolvió la novedad.').max(OBSERVACIONES_MAX),
  referenciaResolucion: z.string().trim().max(REFERENCIA_NOVEDAD_MAX),
  cantidades: cantidadesSchema,
}).superRefine((datos, ctx) => {
  if (datos.tipoResolucion === 'REPOSICION') {
    validarCantidades(datos.cantidades, ctx, 'Registra las denominaciones que recibió la bóveda.')
  } else if (!datos.referenciaResolucion) {
    ctx.addIssue({ code: 'custom', path: ['referenciaResolucion'], message: 'Ingresa la referencia de respaldo.' })
  }
})

type Formulario = z.infer<typeof formulario>

export function ResolverNovedadDialog({ idArqueo, novedad, onCerrar, onResuelta }: {
  idArqueo: number
  novedad: NonNullable<Arqueo['novedad']>
  onCerrar: () => void
  onResuelta: () => void
}) {
  const operacion = useResolverNovedadArqueo(idArqueo)
  const catalogo = useDenominaciones()
  const { control, register, handleSubmit, setError, formState: { errors } } = useForm<Formulario>({
    resolver: zodResolver(formulario),
    defaultValues: { tipoResolucion: 'JUSTIFICACION', observaciones: '', referenciaResolucion: '', cantidades: {} },
  })
  const tipo = useWatch({ control, name: 'tipoResolucion' })
  const cantidades = useWatch({ control, name: 'cantidades' }) ?? {}
  const reposicion = tipo === 'REPOSICION'
  const total = totalDesglose(armarDesglose(cantidades), valoresPorDenominacion(catalogo.data))
  const pendiente = operacion.isPending
  const errorCantidades = (errors.cantidades as { message?: string } | undefined)?.message

  const enviar = async (datos: Formulario) => {
    if (reposicion && Math.round(total * 100) !== Math.round(novedad.monto * 100)) {
      setError('cantidades', { message: 'El efectivo de reposición debe cubrir el monto completo de la novedad.' })
      return
    }
    try {
      await operacion.mutateAsync({
        tipoResolucion: datos.tipoResolucion,
        observaciones: datos.observaciones,
        ...(reposicion ? { desglose: armarDesglose(datos.cantidades) } : { referenciaResolucion: datos.referenciaResolucion }),
      })
      onResuelta()
    } catch (error) {
      for (const { field, message } of toApiError(error).fields) {
        const campo = field.split('.').pop()
        if (campo === 'tipoResolucion' || campo === 'observaciones' || campo === 'referenciaResolucion') {
          setError(campo, { message }, { shouldFocus: true })
        }
        if (field.includes('desglose')) setError('cantidades', { message })
      }
    }
  }

  return (
    <DialogoOperacion
      open
      ocupado={pendiente}
      onCerrar={onCerrar}
      titulo="Resolver novedad de cajero"
      descripcion="Registra el respaldo o la reposición que permite cerrar la novedad."
      pie={
        <>
          <Button type="button" variant="outline" disabled={pendiente} onClick={onCerrar}>Volver</Button>
          <Button type="submit" form="form-resolver-novedad" disabled={pendiente || (reposicion && !catalogo.isSuccess)}>
            {pendiente && <LoaderCircle className="animate-spin" />}
            {pendiente ? 'Registrando…' : 'Registrar resolución'}
          </Button>
        </>
      }
    >
      <form id="form-resolver-novedad" onSubmit={handleSubmit(enviar)} className="flex flex-col gap-4" aria-busy={pendiente} noValidate>
        <NovedadArqueo novedad={novedad} />
        <fieldset disabled={pendiente} className="flex flex-col gap-4">
          <legend className="sr-only">Datos de la resolución</legend>
          <Campo id="novedad-tipo" label="Tipo de resolución" error={errors.tipoResolucion?.message}>
            <select id="novedad-tipo" className={selectClassName} {...ariaCampo('novedad-tipo', errors.tipoResolucion?.message)} {...register('tipoResolucion')}>
              {TIPOS_RESOLUCION_NOVEDAD.map((item) => <option key={item} value={item}>{ETIQUETAS_RESOLUCION_NOVEDAD[item]}</option>)}
            </select>
          </Campo>
          {reposicion ? (
            <>
              {catalogo.isError ? <ErrorOperacion>No pudimos cargar las denominaciones.</ErrorOperacion> : (
                <CuadriculaDenominaciones
                  denominaciones={catalogo.data}
                  cantidades={cantidades}
                  registrar={(id) => register(`cantidades.${claveDenominacion(id)}`)}
                  errores={erroresPorDenominacion(errors.cantidades)}
                />
              )}
              {errorCantidades && <ErrorOperacion>{errorCantidades}</ErrorOperacion>}
              <p className="text-sm text-muted-foreground" aria-live="polite">Total recibido <strong>{formatearMonto(total)}</strong></p>
            </>
          ) : (
            <Campo id="novedad-ref" label={tipo === 'DESCUENTO_ROL' ? 'Referencia del descuento aplicado' : 'Referencia del documento de respaldo'}
              error={errors.referenciaResolucion?.message}
            >
              <Input id="novedad-ref" maxLength={REFERENCIA_NOVEDAD_MAX} className={campoClassName}
                {...ariaCampo('novedad-ref', errors.referenciaResolucion?.message)} {...register('referenciaResolucion')}
              />
            </Campo>
          )}
          <Campo id="novedad-obs" label="Observaciones" error={errors.observaciones?.message}>
            <textarea id="novedad-obs" rows={3} maxLength={OBSERVACIONES_MAX} className={textareaClassName}
              {...ariaCampo('novedad-obs', errors.observaciones?.message)} {...register('observaciones')}
            />
          </Campo>
        </fieldset>
        {operacion.isError && <ErrorOperacion>{mensajeErrorOperacion(operacion.error, 'resolver la novedad')}</ErrorOperacion>}
      </form>
    </DialogoOperacion>
  )
}
