import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleCheck, UserPlus } from 'lucide-react'

import { Aviso, AvisoRequiereAprobacion, Button } from '@/shared/ui'
import { toApiError } from '@/shared/api'
import { registrarCliente, reincorporarCliente, errorRegistro } from '@/features/clientes/api/registro-cliente'
import { comprobarDocumento } from '@/features/clientes/api/documentos-identidad'
import type { Cliente } from '@/features/clientes/api/clientes.contract'
import { RegistroStepper, type Paso } from '@/features/clientes/components/RegistroStepper'
import { DatosClienteStep } from '@/features/clientes/components/steps/DatosClienteStep'
import { DireccionesStep } from '@/features/clientes/components/steps/DireccionesStep'
import { ActividadEconomicaStep } from '@/features/clientes/components/steps/ActividadEconomicaStep'
import { MENSAJE_CLIENTE_ELIMINADO } from '@/features/clientes/lib/reincorporacion'
import {
  ACTIVIDAD_VACIA,
  actividadSchema,
  DATOS_CLIENTE_VACIOS,
  datosClienteSchema,
  DIRECCIONES_VACIAS,
  direccionesSchema,
  type ActividadData,
  type ActividadInput,
  type DatosClienteData,
  type DatosClienteInput,
  type DireccionesData,
  type DireccionesInput,
  type RegistroClienteData,
} from '@/features/clientes/schemas/registro-cliente.schema'

const PASOS = [
  { titulo: 'Documento', descripcion: 'Comprobación de identidad' },
  { titulo: 'Datos del cliente', descripcion: 'Identificación y contacto' },
  { titulo: 'Direcciones', descripcion: 'Principal y adicionales' },
  { titulo: 'Actividad económica', descripcion: 'Actividad y consentimiento' },
] as const satisfies readonly Paso[]

export interface RegistroClienteWizardProps {
  initialError?: unknown
  initialIdSolicitud?: number | null
  initialPayload?: RegistroClienteData | null
}

/**
 * Un formulario por paso. Los tres viven aquí (no en cada paso) para conservar lo escrito al ir
 * y volver entre pasos; cada paso valida solo su esquema antes de avanzar.
 */
export function RegistroClienteWizard({
  initialError,
  initialIdSolicitud = null,
  initialPayload = null,
}: RegistroClienteWizardProps = {}) {
  const [paso, setPaso] = useState(0)
  const [alcanzado, setAlcanzado] = useState(0)
  const [registro, setRegistro] = useState<Cliente | null>(null)
  const [errorExterno, setErrorExterno] = useState<unknown>(initialError)
  const [idSolicitudReincorporacion, setIdSolicitudReincorporacion] = useState<number | null>(initialIdSolicitud)
  const [ultimoPayload, setUltimoPayload] = useState<RegistroClienteData | null>(initialPayload)

  const consultaDocumento = useMutation({ mutationFn: comprobarDocumento, retry: false })
  const [modoReincorporacion, setModoReincorporacion] = useState(false)
  const [avisosDocumento, setAvisosDocumento] = useState<string[]>([])
  const [coincidencia, setCoincidencia] = useState<Awaited<ReturnType<typeof comprobarDocumento>> | null>(null)

  const cache = useQueryClient()
  const guardado = useMutation({
    mutationFn: registrarCliente,
    retry: false,
    onSuccess: async (cliente) => {
      cache.setQueryData(['clientes', 'detalle', cliente.idCliente], cliente)
      await cache.invalidateQueries({ queryKey: ['clientes', 'busqueda'] })
    },
  })

  const reincorporacion = useMutation({
    mutationFn: reincorporarCliente,
    retry: false,
    onSuccess: (solicitud) => {
      setIdSolicitudReincorporacion(solicitud.idSolicitud)
    },
  })

  const errorActivo = guardado.error ?? errorExterno
  const errorGuardado = errorActivo ? toApiError(errorActivo) : null
  const esClienteEliminado = errorGuardado?.code === 'CLIENTE_ELIMINADO'

  const inicioRef = useRef<HTMLDivElement>(null)

  const datosForm = useForm<DatosClienteInput, unknown, DatosClienteData>({
    resolver: zodResolver(datosClienteSchema),
    defaultValues: DATOS_CLIENTE_VACIOS,
  })
  const direccionesForm = useForm<DireccionesInput, unknown, DireccionesData>({
    resolver: zodResolver(direccionesSchema),
    defaultValues: DIRECCIONES_VACIAS,
  })
  const actividadForm = useForm<ActividadInput, unknown, ActividadData>({
    resolver: zodResolver(actividadSchema),
    defaultValues: ACTIVIDAD_VACIA,
  })

  const irA = (indice: number) => {
    setPaso(indice)
    setAlcanzado((anterior) => Math.max(anterior, indice))
    inicioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const verificarDocumento = async (documento: Parameters<typeof comprobarDocumento>[0]) => {
    setCoincidencia(null)
    setModoReincorporacion(false)
    setAvisosDocumento([])
    try {
      const resultado = await consultaDocumento.mutateAsync(documento)
      if (resultado.existe || !resultado.valida) {
        setAlcanzado(0)
        setCoincidencia(resultado)
      }
      else {
        setAvisosDocumento(resultado.advertencias)
        irA(1)
      }
    } catch {
      // Los datos permanecen en el formulario para reintentar.
    }
  }

  const registrar = async (actividad: ActividadData) => {
    if (guardado.isPending || reincorporacion.isPending) return
    // Si se editó un paso anterior desde el indicador, se vuelve a validar antes de enviar
    if (!(await datosForm.trigger())) return irA(1)
    if (!(await direccionesForm.trigger())) return irA(2)

    const solicitud: RegistroClienteData = {
      cliente: { ...datosClienteSchema.parse(datosForm.getValues()), ...actividad },
      direcciones: direccionesSchema.parse(direccionesForm.getValues()).direcciones,
    }
    setUltimoPayload(solicitud)
    setErrorExterno(null)
    setIdSolicitudReincorporacion(null)
    reincorporacion.reset()
    try {
      if (modoReincorporacion) {
        await reincorporacion.mutateAsync(solicitud)
        return
      }
      const cliente = await guardado.mutateAsync(solicitud)
      setRegistro(cliente)
      irA(PASOS.length)
    } catch {
      // La mutación presenta el error sin limpiar los tres formularios.
    }
  }

  const solicitarReincorporacion = async () => {
    if (reincorporacion.isPending) return
    const payload = ultimoPayload ?? {
      cliente: { ...datosClienteSchema.parse(datosForm.getValues()), ...actividadSchema.parse(actividadForm.getValues()) },
      direcciones: direccionesSchema.parse(direccionesForm.getValues()).direcciones,
    }
    try {
      const solicitud = await reincorporacion.mutateAsync(payload)
      setIdSolicitudReincorporacion(solicitud.idSolicitud)
    } catch {
      // El error de la reincorporación se muestra en pantalla.
    }
  }

  const nuevoRegistro = () => {
    datosForm.reset(DATOS_CLIENTE_VACIOS)
    direccionesForm.reset(DIRECCIONES_VACIAS)
    actividadForm.reset(ACTIVIDAD_VACIA)
    setRegistro(null)
    guardado.reset()
    reincorporacion.reset()
    setErrorExterno(null)
    setIdSolicitudReincorporacion(null)
    setUltimoPayload(null)
    setCoincidencia(null)
    setModoReincorporacion(false)
    consultaDocumento.reset()
    setAlcanzado(0)
    irA(0)
  }

  const ocupado = guardado.isPending || reincorporacion.isPending || consultaDocumento.isPending

  return (
    <div ref={inicioRef} className="flex scroll-mt-6 flex-col gap-8">
      <fieldset disabled={ocupado} className="flex min-w-0 flex-col gap-8" aria-busy={ocupado}>
      <RegistroStepper pasos={PASOS} actual={paso} alcanzado={paso === 0 ? 0 : alcanzado} onSelect={(indice) => { if (paso !== 0 || indice === 0) irA(indice) }} />

      <section className="rounded-3xl border border-border bg-card p-6 not-dark:shadow-xl not-dark:shadow-brand-ink/5 sm:p-10">
        {paso === 0 && (
          <>
            <DatosClienteStep form={datosForm} soloDocumento verificar={verificarDocumento} onNext={() => irA(2)} />
            {consultaDocumento.isPending && <p role="status">Comprobando documento…</p>}
            {consultaDocumento.isError && <Aviso tono="error">{toApiError(consultaDocumento.error).message}</Aviso>}
            {coincidencia && (
              <Aviso tono="info">
                <p>{coincidencia.tipoCoincidencia === 'EQUIVALENCIA'
                  ? 'Encontramos una ficha por la equivalencia entre cédula y RUC.'
                  : coincidencia.mensaje}</p>
                {coincidencia.reincorporable && coincidencia.tipoCoincidencia === 'EXACTA' && (
                  <Button type="button" variant="outline" onClick={() => {
                    setModoReincorporacion(true)
                    irA(1)
                  }}>Preparar reincorporación</Button>
                )}
                {coincidencia.idCliente && <Link className="text-link underline" to={'/clientes-busqueda/' + coincidencia.idCliente}>Abrir ficha existente</Link>}
              </Aviso>
            )}
          </>
        )}
         {paso === 1 && (
          <>
            {avisosDocumento.length > 0 && <Aviso tono="info">{avisosDocumento.join(' ')}</Aviso>}
            <DatosClienteStep form={datosForm} onNext={() => irA(2)} />
          </>
        )}
        {paso === 2 && <DireccionesStep form={direccionesForm} onBack={() => irA(1)} onNext={() => irA(3)} />}
        {paso === 3 && <ActividadEconomicaStep form={actividadForm} onBack={() => irA(2)} onSubmit={registrar} />}
        {guardado.isPending && <p role="status" className="mt-4 text-sm text-muted-foreground">Guardando cliente…</p>}
        {reincorporacion.isPending && <p role="status" className="mt-4 text-sm text-muted-foreground">Solicitando reincorporación…</p>}

        {idSolicitudReincorporacion !== null && (
          <div className="mt-6">
            <AvisoRequiereAprobacion idSolicitud={idSolicitudReincorporacion} />
          </div>
        )}

        {esClienteEliminado && idSolicitudReincorporacion === null && (
          <div className="mt-6">
            <Aviso tono="info">
              <p>{MENSAJE_CLIENTE_ELIMINADO}</p>
              <div>
                <Button
                  type="button"
                  onClick={solicitarReincorporacion}
                  disabled={ocupado}
                >
                  Solicitar reincorporación
                </Button>
              </div>
            </Aviso>
            {reincorporacion.isError && (
              <div className="mt-4">
                <Aviso tono="error">{errorRegistro(reincorporacion.error)}</Aviso>
              </div>
            )}
          </div>
        )}

        {Boolean(errorActivo) && !esClienteEliminado && !registro && (
          <div className="mt-6">
            <Aviso tono="error">
              {errorRegistro(errorActivo)}
              <Link to="/clientes-busqueda" className="font-semibold underline">
                Consultar clientes
              </Link>
            </Aviso>
          </div>
        )}

        {registro && <RegistroCompletado registro={registro} onNuevo={nuevoRegistro} />}
      </section>
      </fieldset>
    </div>
  )
}

function RegistroCompletado({ registro: cliente, onNuevo }: { registro: Cliente; onNuevo: () => void }) {
  const { direcciones } = cliente
  const nombre = cliente.razonSocial ?? `${cliente.nombres} ${cliente.apellidos ?? ''}`

  const resumen = [
    { label: cliente.tipoDocumento === 'P' ? 'Pasaporte' : cliente.tipoDocumento === 'C' ? 'Cédula' : cliente.tipoDocumento, valor: cliente.identificacion },
    { label: 'Tipo de cliente', valor: cliente.tipoCliente === 'Natural' ? 'Persona natural' : 'Persona jurídica' },
    { label: 'Estado', valor: cliente.estado },
    { label: 'Correo', valor: cliente.email },
  ]

  return (
    <div role="status" className="flex flex-col items-center gap-6 py-6 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-primary/15 text-link">
        <CircleCheck className="size-8" />
      </span>
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-heading">Cliente registrado</h2>
        <p className="max-w-md text-muted-foreground">
          El backend confirmó el registro de <span className="font-semibold text-heading">{nombre}</span>.
          {cliente.estado === 'Pendiente' && ' El cliente queda pendiente de su evaluación de riesgo; todavía no está activo.'}
        </p>
      </div>

      <dl className="grid w-full max-w-lg gap-px overflow-hidden rounded-2xl border border-border bg-border text-left sm:grid-cols-2">
        {resumen.map(({ label, valor }) => (
          <div key={label} className={`flex flex-col gap-0.5 bg-field px-4 py-3 ${label === 'Correo' ? 'sm:col-span-2' : ''}`}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="truncate font-medium text-heading">{valor}</dd>
          </div>
        ))}
        <div className="flex flex-col gap-2 bg-field px-4 py-3 sm:col-span-2">
          <dt className="text-xs text-muted-foreground">Direcciones</dt>
          <dd className="flex flex-col gap-2 text-heading">
            <span className="font-medium">{direcciones.length} {direcciones.length === 1 ? 'dirección' : 'direcciones'}</span>
            <ul className="flex flex-col gap-2 text-sm">
              {direcciones.map((direccion) => (
                <li key={direccion.idDireccion} className="wrap-break-word">
                  <span className="font-medium">
                    {direccion.tipoDireccion}
                  </span>
                  {direccion.esPrincipal && <span className="font-medium"> (principal)</span>}
                  {' · '}{direccion.calleDireccion}
                  {direccion.sector && <span className="text-muted-foreground"> · {direccion.sector}</span>}
                </li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>

      <Button asChild className="h-[52px] rounded-xl px-8 text-base"><Link to={`/clientes-busqueda/${cliente.idCliente}`}>Ver cliente registrado</Link></Button>
      <Button variant="outline" onClick={onNuevo} className="h-[52px] rounded-xl px-8 text-base font-semibold">
        <UserPlus />
        Registrar otro cliente
      </Button>
    </div>
  )
}
