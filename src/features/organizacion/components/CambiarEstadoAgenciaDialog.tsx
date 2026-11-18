import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'

import { toApiError } from '@/shared/api'
import {
  Aviso,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@/shared/ui'
import type { AgenciaDetalle } from '@/features/organizacion/api/agencias.contract'
import { CampoAgencia, inputClassName } from '@/features/organizacion/components/CampoAgencia'
import { useCambiarEstadoAgencia } from '@/features/organizacion/hooks/useAgenciasAdmin'
import {
  mensajeErrorAgencia,
  motivoFormSchema,
  type MotivoFormData,
  type MotivoFormInput,
} from '@/features/organizacion/lib/agencia-form'
import { a11yCampo, type AccionEstado } from '@/features/organizacion/lib/agencias'

export interface CambioEstado {
  agencia: AgenciaDetalle
  accion: AccionEstado
}

interface CambiarEstadoAgenciaDialogProps {
  /** null = cerrado */
  cambio: CambioEstado | null
  onCerrar: () => void
  onGuardado: (mensaje: string | number) => void
  onRestaurarFoco: () => void
}

const TEXTOS: Record<AccionEstado, { titulo: string; descripcion: string; boton: string; hecho: string }> = {
  desactivar: {
    titulo: 'Desactivar agencia',
    descripcion:
      'La agencia seguirá activa hasta que otra persona apruebe la solicitud.',
    boton: 'Solicitar desactivación',
    hecho: 'Desactivamos',
  },
  activar: {
    titulo: 'Activar agencia',
    descripcion: 'Vuelve a estar disponible para operar.',
    boton: 'Activar',
    hecho: 'Activamos',
  },
}

/** ORG-02 con `estado` y el motivo, que queda en la auditoría */
export function CambiarEstadoAgenciaDialog({ cambio, onCerrar, onGuardado, onRestaurarFoco }: CambiarEstadoAgenciaDialogProps) {
  const actualizar = useCambiarEstadoAgencia()
  const cerrar = () => {
    actualizar.reset()
    onCerrar()
  }
  return (
    <Dialog open={cambio !== null} onOpenChange={(abierto) => !abierto && !actualizar.isPending && cerrar()}>
      <DialogContent showCloseButton={!actualizar.isPending} onCloseAutoFocus={(event) => { event.preventDefault(); onRestaurarFoco() }} className="gap-5 p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-heading">
            {cambio && `${TEXTOS[cambio.accion].titulo} ${cambio.agencia.codigo}`}
          </DialogTitle>
          <DialogDescription>{cambio && TEXTOS[cambio.accion].descripcion}</DialogDescription>
        </DialogHeader>
        {cambio && (
          <FormularioEstado key={`${cambio.agencia.idAgencia}-${cambio.accion}`} cambio={cambio} actualizar={actualizar} onCancelar={cerrar} onGuardado={(mensaje) => { actualizar.reset(); onGuardado(mensaje) }} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function FormularioEstado({ cambio, actualizar, onCancelar, onGuardado }: {
  cambio: CambioEstado
  actualizar: ReturnType<typeof useCambiarEstadoAgencia>
  onCancelar: () => void
  onGuardado: (mensaje: string | number) => void
}) {
  const { agencia, accion } = cambio
  const textos = TEXTOS[accion]
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MotivoFormInput, unknown, MotivoFormData>({
    resolver: zodResolver(motivoFormSchema),
    defaultValues: { motivo: '' },
  })

  const guardar = ({ motivo }: MotivoFormData) =>
    actualizar.mutate(
      { idAgencia: agencia.idAgencia, body: { estado: accion === 'desactivar' ? 'I' : 'A', motivo } },
      { onSuccess: (resultado) => onGuardado('idSolicitud' in resultado ? resultado.idSolicitud : `${textos.hecho} la agencia ${agencia.codigo}.`) },
    )

  const errorApi = actualizar.isError ? toApiError(actualizar.error) : null
  const ayuda = 'Queda registrado en la auditoría.'

  return (
    <form onSubmit={handleSubmit(guardar)} noValidate className="flex flex-col gap-5">
      <CampoAgencia id="agencia-motivo" label="Motivo" error={errors.motivo?.message} ayuda={ayuda}>
        <Input
          id="agencia-motivo"
          autoComplete="off"
          maxLength={300}
          readOnly={actualizar.isPending}
          className={inputClassName}
          {...a11yCampo('agencia-motivo', errors.motivo?.message, ayuda)}
          {...register('motivo')}
        />
      </CampoAgencia>

      {errorApi && (
        <Aviso tono="error">
          {errorApi.bloqueos.length > 0 ? (
            <>
              <p>La desactivación está bloqueada por estos recursos u operaciones:</p>
              <ul className="list-disc pl-5">
                {errorApi.bloqueos.map((bloqueo) => <li key={bloqueo}>{bloqueo}</li>)}
              </ul>
            </>
          ) : mensajeErrorAgencia(errorApi)}
        </Aviso>
      )}

      <DialogFooter className="-mx-6 -mb-6 px-6">
        <Button type="button" variant="outline" size="lg" onClick={onCancelar} disabled={actualizar.isPending} className="rounded-lg px-4">
          Cancelar
        </Button>
        <Button
          type="submit"
          size="lg"
          variant={accion === 'desactivar' ? 'destructive' : 'default'}
          disabled={actualizar.isPending}
          className="rounded-lg px-4 font-semibold"
        >
          {actualizar.isPending && <LoaderCircle className="animate-spin" />}
          {actualizar.isPending ? 'Procesando…' : textos.boton}
        </Button>
      </DialogFooter>
    </form>
  )
}
