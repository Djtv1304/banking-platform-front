import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, Save } from 'lucide-react'

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
import type { ProductoAdmin } from '@/features/organizacion/api/productos.contract'
import { CampoAgencia as Campo, inputClassName } from '@/features/organizacion/components/CampoAgencia'
import { useCrearSubProducto } from '@/features/organizacion/hooks/useProductosAdmin'
import { a11yCampo } from '@/features/organizacion/lib/agencias'
import {
  mensajeErrorProducto,
  subProductoFormSchema,
  type SubProductoFormData,
  type SubProductoFormInput,
} from '@/features/organizacion/lib/producto-form'

interface SubProductoFormDialogProps {
  /** Producto al que se agrega; null = cerrado */
  producto: ProductoAdmin | null
  onCerrar: () => void
  onGuardado: (mensaje: string) => void
}

/** Alta de un subproducto (solo ADMIN): la variante que el asesor ofrece al cliente */
export function SubProductoFormDialog({ producto, onCerrar, onGuardado }: SubProductoFormDialogProps) {
  return (
    <Dialog open={producto !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="gap-5 p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-heading">
            Nuevo modelo comercial{producto ? ` de ${producto.nombreProducto}` : ''}
          </DialogTitle>
          <DialogDescription>
            El modelo se crea en Borrador. Su oferta requiere que los registros esten Activos y el cliente cumpla su elegibilidad.
          </DialogDescription>
        </DialogHeader>
        {producto && <Formulario key={producto.idProducto} producto={producto} onCancelar={onCerrar} onGuardado={onGuardado} />}
      </DialogContent>
    </Dialog>
  )
}

function Formulario({
  producto,
  onCancelar,
  onGuardado,
}: {
  producto: ProductoAdmin
  onCancelar: () => void
  onGuardado: (mensaje: string) => void
}) {
  const crear = useCrearSubProducto()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SubProductoFormInput, unknown, SubProductoFormData>({
    resolver: zodResolver(subProductoFormSchema(producto.tipoProducto)),
    defaultValues: { codigoSubProducto: '', nombreSubProducto: '' },
  })
  const error = crear.error ? toApiError(crear.error) : null
  const ayuda =
    producto.tipoProducto === 'Tarjeta'
      ? 'Empieza por TDB (débito) o TCR (crédito). Ej.: TDB002-VS.'
      : `De 3 a 15 letras, números o guiones. Ej.: ${producto.codigoProducto}-PN.`

  const guardar = (datos: SubProductoFormData) =>
    crear.mutate(
      { idProducto: producto.idProducto, body: datos },
      {
        onSuccess: (s) => onGuardado(`Agregamos el modelo ${s.codigoSubProducto} a ${producto.codigoProducto}.`),
        onError: (e) => {
          const apiError = toApiError(e)
          if (apiError.code === 'CODIGO_DUPLICADO' || apiError.code === 'CODIGO_TARJETA_INVALIDO') {
            setError('codigoSubProducto', { message: mensajeErrorProducto(apiError) })
          }
        },
      },
    )

  const general =
    error && error.code !== 'CODIGO_DUPLICADO' && error.code !== 'CODIGO_TARJETA_INVALIDO' ? mensajeErrorProducto(error) : null

  return (
    <form onSubmit={handleSubmit(guardar)} noValidate className="flex flex-col gap-5">
      <Campo id="sub-codigo" label="Código" error={errors.codigoSubProducto?.message} ayuda={ayuda}>
        <Input
          id="sub-codigo"
          autoComplete="off"
          maxLength={15}
          className={`${inputClassName} uppercase`}
          {...a11yCampo('sub-codigo', errors.codigoSubProducto?.message, ayuda)}
          {...register('codigoSubProducto')}
        />
      </Campo>
      <Campo id="sub-nombre" label="Nombre" error={errors.nombreSubProducto?.message}>
        <Input
          id="sub-nombre"
          autoComplete="off"
          maxLength={100}
          className={inputClassName}
          {...a11yCampo('sub-nombre', errors.nombreSubProducto?.message)}
          {...register('nombreSubProducto')}
        />
      </Campo>
      <div className="grid gap-3 sm:grid-cols-2">
        {(['edadMinima', 'edadMaxima', 'idSubProductoRequerido', 'maximoPorCliente'] as const).map((campo) => (
          <Campo key={campo} id={`sub-${campo}`} label={{ edadMinima: 'Edad mínima', edadMaxima: 'Edad máxima', idSubProductoRequerido: 'ID del subproducto requerido', maximoPorCliente: 'Máximo por cliente' }[campo]} error={errors[campo]?.message}>
            <Input id={`sub-${campo}`} type="number" min={campo.startsWith('edad') ? 0 : 1} max={campo.startsWith('edad') ? 120 : undefined} step={1} {...register(campo, { setValueAs: (v: string) => v === '' ? undefined : Number(v) })} aria-invalid={!!errors[campo]} aria-describedby={errors[campo] ? `sub-${campo}-error` : undefined} />
          </Campo>
        ))}
        <Campo id="sub-tipo-cliente" label="Tipo de cliente">
          <select id="sub-tipo-cliente" className={inputClassName} {...register('tipoClientePermitido')}>
            <option value="Ambos">Ambos</option><option value="Natural">Natural</option><option value="Juridico">Jurídico</option>
          </select>
        </Campo>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('requiereTutor')} />Requiere tutor</label>
      </div>
      {general && <Aviso tono="error">{general}</Aviso>}
      <DialogFooter className="-mx-6 -mb-6 px-6">
        <Button type="button" variant="outline" size="lg" onClick={onCancelar} className="rounded-lg px-4">
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={crear.isPending} className="rounded-lg px-4 font-semibold">
          {crear.isPending ? <LoaderCircle className="animate-spin" /> : <Save />}
          Agregar modelo
        </Button>
      </DialogFooter>
    </form>
  )
}
