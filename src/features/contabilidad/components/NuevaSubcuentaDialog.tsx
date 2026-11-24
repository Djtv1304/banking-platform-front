import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'

import { toApiError } from '@/shared/api'
import {
  Aviso,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/shared/ui'
import { CampoCuenta, inputCuentaClassName } from '@/features/contabilidad/components/CampoCuenta'
import { useCrearCuenta } from '@/features/contabilidad/hooks/useMantenimientoCuentas'
import type { NodoCuenta } from '@/features/contabilidad/lib/arbol'
import { LARGO_CODIGO_SUBCUENTA, etiquetaNaturaleza } from '@/features/contabilidad/lib/cuenta-contable'
import {
  LARGO_MAXIMO_NOMBRE,
  siguienteCodigoLibre,
  subcuentaFormSchema,
  type SubcuentaFormData,
  type SubcuentaFormInput,
  a11yCampoCuenta,
} from '@/features/contabilidad/lib/cuenta-form'
import { erroresDeCampo, mensajeErrorPlanCuentas, mensajeResultado } from '@/features/contabilidad/lib/mensajes'

interface NuevaSubcuentaDialogProps {
  /** Cuenta superior; null = cerrado */
  padre: NodoCuenta | null
  onCerrar: () => void
  onHecho: (mensaje: string) => void
}

/** Alta de una subcuenta bajo la cuenta seleccionada (POST propuesto) */
export function NuevaSubcuentaDialog({ padre, onCerrar, onHecho }: NuevaSubcuentaDialogProps) {
  return (
    <Dialog open={padre !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="gap-5 p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-heading">Nueva subcuenta</DialogTitle>
          <DialogDescription>
            {padre &&
              `Bajo ${padre.cuenta.codigoCuenta} · ${padre.cuenta.nombreCuenta}. Hereda su naturaleza (${etiquetaNaturaleza(padre.cuenta.naturaleza).toLowerCase()}).`}
          </DialogDescription>
        </DialogHeader>
        {padre && <FormularioSubcuenta key={padre.cuenta.idCuentaContable} padre={padre} onCancelar={onCerrar} onHecho={onHecho} />}
      </DialogContent>
    </Dialog>
  )
}

function FormularioSubcuenta({ padre, onCancelar, onHecho }: { padre: NodoCuenta; onCancelar: () => void; onHecho: (mensaje: string) => void }) {
  const codigoPadre = padre.cuenta.codigoCuenta
  const codigosHijas = padre.hijos.map((hija) => hija.cuenta.codigoCuenta)
  const ultimoNivel = padre.hijos.length === 0
  const largoHija = codigoPadre.length + 2
  const siguienteLibre = siguienteCodigoLibre(codigoPadre, codigosHijas, ultimoNivel)
  const crear = useCrearCuenta()
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SubcuentaFormInput, unknown, SubcuentaFormData>({
    resolver: zodResolver(subcuentaFormSchema(codigoPadre, codigosHijas, ultimoNivel)),
    defaultValues: { codigoCuenta: siguienteLibre ?? codigoPadre, nombreCuenta: '', esImputable: true },
  })

  const guardar = (datos: SubcuentaFormData) => {
    setErrorGeneral(null)
    crear.mutate(
      { ...datos, idCuentaSuperior: padre.cuenta.idCuentaContable },
      {
        onSuccess: ({ pendiente }) => onHecho(mensajeResultado(pendiente, `Creamos la subcuenta ${datos.codigoCuenta}.`)),
        onError: (error) => {
          const apiError = toApiError(error)
          const campos = erroresDeCampo(apiError, ['codigoCuenta', 'nombreCuenta'])
          for (const [campo, mensaje] of campos) setError(campo, { message: mensaje }, { shouldFocus: true })
          if (campos.size === 0) setErrorGeneral(mensajeErrorPlanCuentas(apiError, 'mantenimiento'))
        },
      },
    )
  }

  const ayudaCodigo = siguienteLibre
    ? `Son ${largoHija} dígitos: ${codigoPadre} más 2 (01 a 99). Siguiente libre: ${siguienteLibre}.`
    : undefined

  return (
    <form onSubmit={handleSubmit(guardar)} noValidate className="flex flex-col gap-5">
      {padre.cuenta.esImputable && (
        <Aviso>{`La cuenta ${codigoPadre} dejará de recibir movimientos: los recibirán sus subcuentas.`}</Aviso>
      )}

      {siguienteLibre === null && (
        <Aviso tono="error">{`La cuenta ${codigoPadre} no admite más subcuentas: ya no quedan códigos libres bajo ella.`}</Aviso>
      )}

      <CampoCuenta id="subcuenta-codigo" label="Código" error={errors.codigoCuenta?.message} ayuda={ayudaCodigo}>
        <Input
          id="subcuenta-codigo"
          inputMode="numeric"
          autoComplete="off"
          maxLength={Math.max(largoHija, LARGO_CODIGO_SUBCUENTA)}
          className={`${inputCuentaClassName} font-mono`}
          {...a11yCampoCuenta('subcuenta-codigo', errors.codigoCuenta?.message, ayudaCodigo)}
          {...register('codigoCuenta')}
        />
      </CampoCuenta>

      <CampoCuenta id="subcuenta-nombre" label="Nombre" error={errors.nombreCuenta?.message}>
        <Input
          id="subcuenta-nombre"
          autoComplete="off"
          maxLength={LARGO_MAXIMO_NOMBRE}
          className={inputCuentaClassName}
          {...a11yCampoCuenta('subcuenta-nombre', errors.nombreCuenta?.message)}
          {...register('nombreCuenta')}
        />
      </CampoCuenta>

      <div className="flex items-start gap-3">
        <Controller
          control={control}
          name="esImputable"
          render={({ field }) => (
            <Checkbox
              id="subcuenta-imputable"
              checked={field.value}
              onCheckedChange={(valor) => field.onChange(valor === true)}
              aria-describedby="subcuenta-imputable-ayuda"
              className="mt-0.5"
            />
          )}
        />
        <div className="flex flex-col gap-1">
          <Label htmlFor="subcuenta-imputable" className="text-sm font-semibold text-heading">
            Imputable
          </Label>
          <p id="subcuenta-imputable-ayuda" className="text-xs text-muted-foreground">
            Recibe movimientos contables. Déjala sin marcar si solo agrupará otras subcuentas.
          </p>
        </div>
      </div>

      {errorGeneral && <Aviso tono="error">{errorGeneral}</Aviso>}

      <DialogFooter className="-mx-6 -mb-6 px-6">
        <Button type="button" variant="outline" size="lg" onClick={onCancelar} className="rounded-lg px-4">
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={crear.isPending || siguienteLibre === null} className="rounded-lg px-4 font-semibold">
          {crear.isPending && <LoaderCircle className="animate-spin" />}
          Crear subcuenta
        </Button>
      </DialogFooter>
    </form>
  )
}
