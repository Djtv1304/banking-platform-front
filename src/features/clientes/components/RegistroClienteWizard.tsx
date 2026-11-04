import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleCheck, UserPlus } from 'lucide-react'

import { Button } from '@/shared/ui'
import { RegistroStepper, type Paso } from '@/features/clientes/components/RegistroStepper'
import { DatosClienteStep } from '@/features/clientes/components/steps/DatosClienteStep'
import { DireccionesStep } from '@/features/clientes/components/steps/DireccionesStep'
import { ActividadEconomicaStep } from '@/features/clientes/components/steps/ActividadEconomicaStep'
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
  { titulo: 'Datos del cliente', descripcion: 'Identificación y contacto' },
  { titulo: 'Direcciones', descripcion: 'Principal y adicionales' },
  { titulo: 'Actividad económica', descripcion: 'Actividad y consentimiento' },
] as const satisfies readonly Paso[]

/**
 * Un formulario por paso. Los tres viven aquí (no en cada paso) para conservar lo escrito al ir
 * y volver entre pasos; cada paso valida solo su esquema antes de avanzar.
 */
export function RegistroClienteWizard() {
  const [paso, setPaso] = useState(0)
  const [alcanzado, setAlcanzado] = useState(0)
  const [registro, setRegistro] = useState<RegistroClienteData | null>(null)
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

  const registrar = async (actividad: ActividadData) => {
    // Si se editó un paso anterior desde el indicador, se vuelve a validar antes de enviar
    if (!(await datosForm.trigger())) return irA(0)
    if (!(await direccionesForm.trigger())) return irA(1)

    const solicitud: RegistroClienteData = {
      cliente: { ...datosClienteSchema.parse(datosForm.getValues()), ...actividad },
      direcciones: direccionesSchema.parse(direccionesForm.getValues()).direcciones,
    }
    // TODO(API): enviar `solicitud` al endpoint de registro de clientes cuando exista su contrato API First
    setRegistro(solicitud)
    irA(PASOS.length)
  }

  const nuevoRegistro = () => {
    datosForm.reset(DATOS_CLIENTE_VACIOS)
    direccionesForm.reset(DIRECCIONES_VACIAS)
    actividadForm.reset(ACTIVIDAD_VACIA)
    setRegistro(null)
    setAlcanzado(0)
    irA(0)
  }

  return (
    <div ref={inicioRef} className="flex scroll-mt-6 flex-col gap-8">
      <RegistroStepper pasos={PASOS} actual={paso} alcanzado={alcanzado} onSelect={irA} />

      <section className="rounded-3xl border border-border bg-card p-6 not-dark:shadow-xl not-dark:shadow-brand-ink/5 sm:p-10">
        {paso === 0 && <DatosClienteStep form={datosForm} onNext={() => irA(1)} />}
        {paso === 1 && <DireccionesStep form={direccionesForm} onBack={() => irA(0)} onNext={() => irA(2)} />}
        {paso === 2 && <ActividadEconomicaStep form={actividadForm} onBack={() => irA(1)} onSubmit={registrar} />}
        {registro && <RegistroCompletado registro={registro} onNuevo={nuevoRegistro} />}
      </section>
    </div>
  )
}

function RegistroCompletado({ registro, onNuevo }: { registro: RegistroClienteData; onNuevo: () => void }) {
  const { cliente, direcciones } = registro
  const nombre = cliente.razonSocial ?? `${cliente.nombres} ${cliente.apellidos}`

  const resumen = [
    { label: cliente.tipoDocumento === 'RUC' ? 'RUC' : 'Cédula', valor: cliente.identificacion },
    { label: 'Tipo de cliente', valor: cliente.tipoCliente === 'NATURAL' ? 'Persona natural' : 'Persona jurídica' },
    { label: 'Direcciones', valor: `${direcciones.length} (1 principal)` },
    { label: 'Correo', valor: cliente.email },
  ]

  return (
    <div role="status" className="flex flex-col items-center gap-6 py-6 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-primary/15 text-link">
        <CircleCheck className="size-8" />
      </span>
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-heading">Datos validados</h2>
        <p className="max-w-md text-muted-foreground">
          La información de <span className="font-semibold text-heading">{nombre}</span> está completa. El registro se
          enviará cuando el servicio de registro de clientes esté disponible.
        </p>
      </div>

      <dl className="grid w-full max-w-lg gap-px overflow-hidden rounded-2xl border border-border bg-border text-left sm:grid-cols-2">
        {resumen.map(({ label, valor }) => (
          <div key={label} className="flex flex-col gap-0.5 bg-field px-4 py-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="truncate font-medium text-heading">{valor}</dd>
          </div>
        ))}
      </dl>

      <Button onClick={onNuevo} className="h-[52px] rounded-xl px-8 text-base font-semibold hover:bg-primary/90">
        <UserPlus />
        Registrar otro cliente
      </Button>
    </div>
  )
}
