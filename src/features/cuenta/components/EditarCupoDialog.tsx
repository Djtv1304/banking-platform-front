import type { ComponentProps } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, Save } from 'lucide-react'

import { toApiError } from '@/shared/api'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/shared/ui'
import type { CupoEfectivo } from '@/features/cuenta/api/cupos.contract'
import { Aviso } from '@/features/cuenta/components/Aviso'
import { useActualizarCupo } from '@/features/cuenta/hooks/useCupos'
import {
  cupoFormSchema,
  DOCUMENTOS_CUPO,
  mensajeErrorCupos,
  valoresCupo,
  type CupoFormData,
  type CupoFormInput,
} from '@/features/cuenta/lib/cupos'

const campoClassName = 'h-11 rounded-xl border-border bg-field px-3 text-base md:text-base dark:bg-field dark:scheme-dark'

interface EditarCupoDialogProps {
  idCuenta: number
  /** Cupo del canal que se edita; null = cerrado */
  cupo: CupoEfectivo | null
  nombreCanal: string
  onCerrar: () => void
  onGuardado: (cupo: CupoEfectivo) => void
}

/** CTA-08 · Crea o reemplaza el cupo personalizado de un canal (SUPERVISOR y ADMIN) */
export function EditarCupoDialog({ idCuenta, cupo, nombreCanal, onCerrar, onGuardado }: EditarCupoDialogProps) {
  return (
    <Dialog open={cupo !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="gap-5 p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-heading">Cupo personalizado · {nombreCanal}</DialogTitle>
          <DialogDescription>
            Reemplaza el cupo de este canal. Ningún valor puede superar el cupo del producto.
          </DialogDescription>
        </DialogHeader>
        {cupo && (
          <FormularioCupo key={cupo.idCanal} idCuenta={idCuenta} cupo={cupo} onCancelar={onCerrar} onGuardado={onGuardado} />
        )}
      </DialogContent>
    </Dialog>
  )
}

interface FormularioCupoProps {
  idCuenta: number
  cupo: CupoEfectivo
  onCancelar: () => void
  onGuardado: (cupo: CupoEfectivo) => void
}

function FormularioCupo({ idCuenta, cupo, onCancelar, onGuardado }: FormularioCupoProps) {
  const actualizar = useActualizarCupo(idCuenta)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CupoFormInput, unknown, CupoFormData>({
    resolver: zodResolver(cupoFormSchema),
    defaultValues: valoresCupo(cupo),
  })

  const guardar = (body: CupoFormData) => actualizar.mutate({ idCanal: cupo.idCanal, body }, { onSuccess: onGuardado })

  const campo = (nombre: keyof CupoFormInput, label: string, props: ComponentProps<'input'>, ayuda?: string) => {
    const id = `cupo-${nombre}`
    const error = errors[nombre]?.message
    return (
      <div className="flex flex-col gap-2">
        <Label htmlFor={id} className="text-sm font-semibold text-heading">
          {label}
        </Label>
        <Input
          id={id}
          autoComplete="off"
          className={campoClassName}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : ayuda && `${id}-ayuda`}
          {...props}
          {...register(nombre)}
        />
        {error ? (
          <p id={`${id}-error`} className="text-sm text-destructive">
            {error}
          </p>
        ) : (
          ayuda && (
            <p id={`${id}-ayuda`} className="text-xs text-muted-foreground">
              {ayuda}
            </p>
          )
        )}
      </div>
    )
  }

  const monto = { inputMode: 'decimal', placeholder: '0.00' } as const

  return (
    <form onSubmit={handleSubmit(guardar)} noValidate className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {campo('cupoDiario', 'Cupo diario (USD)', monto)}
        {campo('cupoMensual', 'Cupo mensual (USD)', monto)}
        {campo('montoMaxTransaccion', 'Máximo por transacción (USD)', monto)}
        {campo('maxTransaccionesDia', 'Transacciones por día', { inputMode: 'numeric' })}
        {campo('fechaVigencia', 'Vigente hasta', { type: 'date' }, 'Opcional. Último día en que rige; vacío no caduca.')}
      </div>

      <fieldset className="grid gap-3 rounded-lg border border-border p-3">
        <legend className="px-1 font-semibold">Pedido del cliente</legend>
        <label className="flex items-center gap-2">
          <input type="checkbox" {...register('solicitadoPorCliente')} />
          El cliente solicitó este ajuste
        </label>
        {errors.solicitadoPorCliente && <p role="alert" className="text-sm text-destructive">{errors.solicitadoPorCliente.message}</p>}
        <Label htmlFor="cupo-documento">Documento verificado</Label>
        <select id="cupo-documento" className={campoClassName} aria-invalid={!!errors.documentoVerificado} {...register('documentoVerificado')}>
          <option value="">Selecciona un documento</option>
          {Object.entries(DOCUMENTOS_CUPO).map(([codigo, nombre]) => <option key={codigo} value={codigo}>{nombre}</option>)}
        </select>
        {errors.documentoVerificado && <p role="alert" className="text-sm text-destructive">{errors.documentoVerificado.message}</p>}
      </fieldset>

      {actualizar.isError && (
        <Aviso tono="error">{mensajeErrorCupos(toApiError(actualizar.error), 'editar')}</Aviso>
      )}

      <DialogFooter className="-mx-6 -mb-6 px-6">
        <Button type="button" variant="outline" size="lg" onClick={onCancelar} className="rounded-lg px-4">
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={actualizar.isPending} className="rounded-lg px-4 font-semibold">
          {actualizar.isPending ? <LoaderCircle className="animate-spin" /> : <Save />}
          Guardar cupo
        </Button>
      </DialogFooter>
    </form>
  )
}
