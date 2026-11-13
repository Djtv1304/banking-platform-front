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
import type { Agencia } from '@/features/catalogos'
import { CampoAgencia, inputClassName } from '@/features/organizacion/components/CampoAgencia'
import { useActualizarAgencia } from '@/features/organizacion/hooks/useAgenciasAdmin'
import {
  mensajeErrorAgencia,
  motivoFormSchema,
  type MotivoFormData,
  type MotivoFormInput,
} from '@/features/organizacion/lib/agencia-form'
import { a11yCampo, type AccionEstado } from '@/features/organizacion/lib/agencias'

export interface CambioEstado {
  agencia: Agencia
  accion: AccionEstado
}

interface CambiarEstadoAgenciaDialogProps {
  /** null = cerrado */
  cambio: CambioEstado | null
  onCerrar: () => void
  onGuardado: (mensaje: string) => void
}

const TEXTOS: Record<AccionEstado, { titulo: string; descripcion: string; boton: string; hecho: string }> = {
  desactivar: {
    titulo: 'Desactivar agencia',
    descripcion:
      'Deja de ofrecerse para nuevas operaciones. La Matriz y las agencias con recursos u operaciones activas no se pueden desactivar.',
    boton: 'Desactivar',
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
export function CambiarEstadoAgenciaDialog({ cambio, onCerrar, onGuardado }: CambiarEstadoAgenciaDialogProps) {
  return (
    <Dialog open={cambio !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="gap-5 p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-heading">
            {cambio && `${TEXTOS[cambio.accion].titulo} ${cambio.agencia.codigo}`}
          </DialogTitle>
          <DialogDescription>{cambio && TEXTOS[cambio.accion].descripcion}</DialogDescription>
        </DialogHeader>
        {cambio && (
          <FormularioEstado key={`${cambio.agencia.idAgencia}-${cambio.accion}`} cambio={cambio} onCancelar={onCerrar} onGuardado={onGuardado} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function FormularioEstado({ cambio, onCancelar, onGuardado }: { cambio: CambioEstado; onCancelar: () => void; onGuardado: (mensaje: string) => void }) {
  const { agencia, accion } = cambio
  const textos = TEXTOS[accion]
  const actualizar = useActualizarAgencia()
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
      { onSuccess: () => onGuardado(`${textos.hecho} la agencia ${agencia.codigo}.`) },
    )

  const ayuda = 'Queda registrado en la auditoría.'

  return (
    <form onSubmit={handleSubmit(guardar)} noValidate className="flex flex-col gap-5">
      <CampoAgencia id="agencia-motivo" label="Motivo" error={errors.motivo?.message} ayuda={ayuda}>
        <Input
          id="agencia-motivo"
          autoComplete="off"
          maxLength={300}
          className={inputClassName}
          {...a11yCampo('agencia-motivo', errors.motivo?.message, ayuda)}
          {...register('motivo')}
        />
      </CampoAgencia>

      {actualizar.isError && <Aviso tono="error">{mensajeErrorAgencia(toApiError(actualizar.error))}</Aviso>}

      <DialogFooter className="-mx-6 -mb-6 px-6">
        <Button type="button" variant="outline" size="lg" onClick={onCancelar} className="rounded-lg px-4">
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
          {textos.boton}
        </Button>
      </DialogFooter>
    </form>
  )
}
