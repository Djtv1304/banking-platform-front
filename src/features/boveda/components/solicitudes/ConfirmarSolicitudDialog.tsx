import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import { z } from 'zod'

import { toApiError } from '@/shared/api'
import { Button, Input } from '@/shared/ui'
import { useDenominaciones } from '@/features/catalogos'
import { mensajeErrorOperacion } from '@/features/boveda/api/bovedas.api'
import { REFERENCIA_REMESA_MAX, type AccionSolicitud, type ConfirmacionSolicitud, type SolicitudMovimiento } from '@/features/boveda/api/bovedas.contract'
import { Campo } from '@/features/boveda/components/Campo'
import { CuadriculaDenominaciones } from '@/features/boveda/components/operaciones/CuadriculaDenominaciones'
import { DialogoOperacion, ErrorOperacion } from '@/features/boveda/components/operaciones/DialogoOperacion'
import { useAvanzarSolicitudMovimiento } from '@/features/boveda/hooks/useBovedas'
import { ariaCampo, campoClassName } from '@/features/boveda/lib/campos'
import { formatearMonto } from '@/features/boveda/lib/formato'
import { armarDesglose, cantidadesSchema, claveDenominacion, erroresPorDenominacion, totalDesglose, validarCantidades } from '@/features/boveda/lib/operaciones'
import { valoresDeSolicitud } from '@/features/boveda/lib/solicitudes'

const TEXTOS_CONFIRMACION: Record<AccionSolicitud, { titulo: string; descripcion: string; exito: string }> = {
  aprobacion: {
    titulo: 'Aprobar solicitud',
    descripcion: 'Se reserva el efectivo o el cupo. El saldo cambia al confirmar el movimiento físico.',
    exito: 'Solicitud aprobada.',
  },
  despacho: {
    titulo: 'Confirmar despacho',
    descripcion: 'Confirma cuando hayas entregado el efectivo. El saldo sale de la bóveda y queda registrado en tránsito.',
    exito: 'Despacho confirmado. El efectivo está en tránsito.',
  },
  recepcion: {
    titulo: 'Confirmar recepción',
    descripcion: 'Registra las piezas que contaste físicamente. Si hay diferencias, indica el acta de novedad.',
    exito: 'Recepción confirmada.',
  },
  devolucion: {
    titulo: 'Confirmar retorno',
    descripcion: 'Registra las piezas devueltas que contaste al recibirlas en la bóveda de origen.',
    exito: 'Retorno confirmado.',
  },
  cierre: {
    titulo: 'Cerrar envío de excedente',
    descripcion: 'Registra la papeleta de depósito o la nota de crédito con la que el banco confirmó la recepción.',
    exito: 'Envío de excedente cerrado.',
  },
}

const REFERENCIAS = {
  numeroGuia: 'Número de guía',
  precinto: 'Precinto de seguridad',
  actaNovedad: 'Acta de novedad',
  comprobanteBanco: 'Papeleta o nota de crédito',
} as const

const referencia = z.string().trim().max(REFERENCIA_REMESA_MAX)
const formulario = z.object({
  numeroGuia: referencia,
  precinto: referencia,
  actaNovedad: referencia,
  comprobanteBanco: referencia,
  cantidades: cantidadesSchema,
})

type Formulario = z.infer<typeof formulario>
type CampoReferencia = keyof typeof REFERENCIAS

function esquema(accion: AccionSolicitud, solicitud: SolicitudMovimiento, campos: CampoReferencia[], requiereGuia: boolean) {
  const cuentaPiezas = accion === 'recepcion' || accion === 'devolucion'
  return formulario.superRefine((datos, ctx) => {
    if (cuentaPiezas) validarCantidades(datos.cantidades, ctx)
    const conteo = armarDesglose(datos.cantidades)
    const piezasSolicitadas = new Map(solicitud.desglose.map((pieza) => [pieza.idDenominacion, pieza.cantidad]))
    const discrepancia = conteo.length !== piezasSolicitadas.size ||
      conteo.some(({ idDenominacion, cantidad }) => piezasSolicitadas.get(idDenominacion) !== cantidad)
    for (const campo of campos) {
      const obligatoria = campo === 'comprobanteBanco' ||
        (campo === 'actaNovedad' && (accion === 'devolucion' || discrepancia)) ||
        ((campo === 'precinto' || campo === 'numeroGuia') && (requiereGuia || Boolean(datos.numeroGuia || datos.precinto)))
      if (obligatoria && !datos[campo]) {
        ctx.addIssue({ code: 'custom', path: [campo], message: 'Ingresa la referencia requerida.' })
      }
    }
  })
}

function payload(accion: AccionSolicitud, formulario: Formulario): ConfirmacionSolicitud {
  const { numeroGuia, precinto, actaNovedad, comprobanteBanco, cantidades } = formulario
  const guia = { numeroGuia: numeroGuia || undefined, precinto: precinto || undefined }
  switch (accion) {
    case 'aprobacion':
      return { accion, datos: {} }
    case 'despacho':
      return { accion, datos: guia }
    case 'recepcion':
      return { accion, datos: { ...guia, desglose: armarDesglose(cantidades), actaNovedad: actaNovedad || undefined } }
    case 'devolucion':
      return { accion, datos: { desglose: armarDesglose(cantidades), actaNovedad } }
    case 'cierre':
      return { accion, datos: { comprobanteBanco } }
  }
}

export function ConfirmarSolicitudDialog({ accion, solicitud, onCerrar, onConfirmada }: {
  accion: AccionSolicitud
  solicitud: SolicitudMovimiento
  onCerrar: () => void
  onConfirmada: (mensaje: string) => void
}) {
  const recepcion = accion === 'recepcion'
  const provision = recepcion && solicitud.tipoMovimiento === 'ProvisionExterna'
  const cuentaPiezas = recepcion || accion === 'devolucion'
  const requiereGuia = provision || (accion === 'despacho' && solicitud.tipoMovimiento === 'EnvioExcedente')
  const campos: CampoReferencia[] = []
  if (accion === 'despacho' || provision) campos.push('numeroGuia', 'precinto')
  if ((recepcion && !provision) || accion === 'devolucion') campos.push('actaNovedad')
  if (accion === 'cierre') campos.push('comprobanteBanco')

  const textos = TEXTOS_CONFIRMACION[accion]
  const operacion = useAvanzarSolicitudMovimiento(solicitud.idSolicitudMovimiento)
  const catalogo = useDenominaciones()
  const { control, register, handleSubmit, setError, formState: { errors } } = useForm<Formulario>({
    resolver: zodResolver(esquema(accion, solicitud, campos, requiereGuia)),
    defaultValues: { numeroGuia: '', precinto: '', actaNovedad: '', comprobanteBanco: '', cantidades: {} },
  })
  const cantidades = useWatch({ control, name: 'cantidades' }) ?? {}
  const totalContado = totalDesglose(armarDesglose(cantidades), valoresDeSolicitud(solicitud, catalogo.data))
  const pendiente = operacion.isPending
  const errorCantidades = (errors.cantidades as { message?: string } | undefined)?.message

  const enviar = async (datos: Formulario) => {
    try {
      await operacion.mutateAsync(payload(accion, datos))
      onConfirmada(textos.exito)
    } catch (error) {
      for (const { field, message } of toApiError(error).fields) {
        const campo = campos.find((nombre) => field.endsWith(nombre))
        if (campo) setError(campo, { message }, { shouldFocus: true })
        if (field.includes('desglose')) setError('cantidades', { message })
      }
    }
  }

  return (
    <DialogoOperacion
      open
      ocupado={pendiente}
      onCerrar={onCerrar}
      titulo={`${textos.titulo} N.º ${solicitud.idSolicitudMovimiento}`}
      descripcion={provision ? 'Cuenta el efectivo y registra la guía y el precinto antes de confirmar la provisión.' : textos.descripcion}
      pie={
        <>
          <Button type="button" variant="outline" onClick={onCerrar} disabled={pendiente}>Volver</Button>
          <Button type="submit" form="form-confirmar-solicitud" disabled={pendiente || (cuentaPiezas && !catalogo.isSuccess)}>
            {pendiente && <LoaderCircle className="animate-spin" />}
            {pendiente ? 'Registrando…' : textos.titulo}
          </Button>
        </>
      }
    >
      <form id="form-confirmar-solicitud" onSubmit={handleSubmit(enviar)} aria-busy={pendiente} className="flex flex-col gap-5" noValidate>
        <p className="text-sm text-muted-foreground">
          Monto solicitado <span className="font-semibold text-heading">{formatearMonto(solicitud.monto)}</span>
        </p>
        {cuentaPiezas && (
          <>
            {catalogo.isError ? <ErrorOperacion>No pudimos cargar las denominaciones.</ErrorOperacion> : (
              <CuadriculaDenominaciones
                denominaciones={catalogo.data}
                cantidades={cantidades}
                registrar={(id) => register(`cantidades.${claveDenominacion(id)}`)}
                errores={erroresPorDenominacion(errors.cantidades)}
                deshabilitado={pendiente}
              />
            )}
            {errorCantidades && <ErrorOperacion>{errorCantidades}</ErrorOperacion>}
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Total contado <span className="font-semibold text-heading">{formatearMonto(totalContado)}</span>
            </p>
          </>
        )}
        {campos.map((campo) => {
          const id = `remesa-${campo}`
          return (
            <Campo key={campo} id={id} label={REFERENCIAS[campo]} error={errors[campo]?.message}
              ayuda={campo === 'actaNovedad' && recepcion ? 'Obligatoria si el efectivo recibido difiere del solicitado.' : undefined}
            >
              <Input id={id} maxLength={REFERENCIA_REMESA_MAX} className={campoClassName} disabled={pendiente}
                {...ariaCampo(id, errors[campo]?.message, campo === 'actaNovedad' && recepcion)} {...register(campo)}
              />
            </Campo>
          )
        })}
        {operacion.isError && <ErrorOperacion>{mensajeErrorOperacion(operacion.error, textos.titulo.toLowerCase())}</ErrorOperacion>}
      </form>
    </DialogoOperacion>
  )
}
