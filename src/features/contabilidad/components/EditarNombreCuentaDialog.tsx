import { useState } from 'react'
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
import { CampoCuenta, inputCuentaClassName } from '@/features/contabilidad/components/CampoCuenta'
import { useRenombrarCuenta } from '@/features/contabilidad/hooks/useMantenimientoCuentas'
import type { NodoCuenta } from '@/features/contabilidad/lib/arbol'
import { LARGO_MAXIMO_NOMBRE, a11yCampoCuenta, nombreFormSchema, type NombreFormData, type NombreFormInput } from '@/features/contabilidad/lib/cuenta-form'
import { erroresDeCampo, mensajeErrorPlanCuentas, mensajeResultado } from '@/features/contabilidad/lib/mensajes'

interface EditarNombreCuentaDialogProps {
  /** null = cerrado */
  nodo: NodoCuenta | null
  onCerrar: () => void
  onHecho: (mensaje: string) => void
}

/** Cambio de nombre (PATCH propuesto). El código, la naturaleza y el superior no se editan */
export function EditarNombreCuentaDialog({ nodo, onCerrar, onHecho }: EditarNombreCuentaDialogProps) {
  return (
    <Dialog open={nodo !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="gap-5 p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-heading">{nodo && `Editar nombre de ${nodo.cuenta.codigoCuenta}`}</DialogTitle>
          <DialogDescription>El código, la naturaleza y la cuenta superior no cambian.</DialogDescription>
        </DialogHeader>
        {nodo && <FormularioNombre key={nodo.cuenta.idCuentaContable} nodo={nodo} onCancelar={onCerrar} onHecho={onHecho} />}
      </DialogContent>
    </Dialog>
  )
}

function FormularioNombre({ nodo, onCancelar, onHecho }: { nodo: NodoCuenta; onCancelar: () => void; onHecho: (mensaje: string) => void }) {
  const { cuenta } = nodo
  const renombrar = useRenombrarCuenta()
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<NombreFormInput, unknown, NombreFormData>({
    resolver: zodResolver(nombreFormSchema),
    defaultValues: { nombreCuenta: cuenta.nombreCuenta },
  })

  const guardar = ({ nombreCuenta }: NombreFormData) => {
    setErrorGeneral(null)
    renombrar.mutate(
      { id: cuenta.idCuentaContable, nombreCuenta },
      {
        onSuccess: ({ pendiente }) => onHecho(mensajeResultado(pendiente, `Actualizamos el nombre de la cuenta ${cuenta.codigoCuenta}.`)),
        onError: (error) => {
          const apiError = toApiError(error)
          const mensajeCampo = erroresDeCampo(apiError, ['nombreCuenta']).get('nombreCuenta')
          if (mensajeCampo) setError('nombreCuenta', { message: mensajeCampo }, { shouldFocus: true })
          else setErrorGeneral(mensajeErrorPlanCuentas(apiError, 'mantenimiento'))
        },
      },
    )
  }

  return (
    <form onSubmit={handleSubmit(guardar)} noValidate className="flex flex-col gap-5">
      <CampoCuenta id="cuenta-nombre" label="Nombre" error={errors.nombreCuenta?.message}>
        <Input
          id="cuenta-nombre"
          autoComplete="off"
          maxLength={LARGO_MAXIMO_NOMBRE}
          className={inputCuentaClassName}
          {...a11yCampoCuenta('cuenta-nombre', errors.nombreCuenta?.message)}
          {...register('nombreCuenta')}
        />
      </CampoCuenta>

      {errorGeneral && <Aviso tono="error">{errorGeneral}</Aviso>}

      <DialogFooter className="-mx-6 -mb-6 px-6">
        <Button type="button" variant="outline" size="lg" onClick={onCancelar} className="rounded-lg px-4">
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={renombrar.isPending} className="rounded-lg px-4 font-semibold">
          {renombrar.isPending && <LoaderCircle className="animate-spin" />}
          Guardar
        </Button>
      </DialogFooter>
    </form>
  )
}
