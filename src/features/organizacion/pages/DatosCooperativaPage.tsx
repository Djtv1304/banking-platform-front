import { useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Building2, CircleAlert, LoaderCircle, Pencil, Plus } from 'lucide-react'

import { usePuedeFuncion, useAuthStore, usePermisos } from '@/features/auth'
import { Button } from '@/shared/ui'
import {
  accesoEntidad,
  ENTIDAD_KEY,
  mensajeErrorEntidad,
  esEntidadAusente,
  type Entidad,
  type EntidadPatch,
} from '@/features/organizacion/api/entidad'
import { EncabezadoEntidad } from '@/features/organizacion/components/EncabezadoEntidad'
import { EntidadForm } from '@/features/organizacion/components/EntidadForm'
import { useActualizarEntidad, useEntidad } from '@/features/organizacion/hooks/useEntidad'
import { useCrearEntidad } from '@/features/organizacion/hooks/useCrearEntidad'
import { datosCrearEntidad, fechaEntidad, type EntidadForm as Valores } from '@/features/organizacion/lib/entidad-form'

export function DatosCooperativaPage() {
  const roles = useAuthStore((store) => store.user?.roles)
  const anterior = accesoEntidad(roles ?? [], usePermisos())
  const acceso = { consulta: usePuedeFuncion('entidad.consultar', anterior.consulta), edicion: usePuedeFuncion('entidad.editar', anterior.edicion) }
  const puedeCrear = usePuedeFuncion('entidad.crear', anterior.edicion)
  const cache = useQueryClient()
  const [baseEdicion, setBaseEdicion] = useState<Entidad | null>(null)
  const editando = baseEdicion !== null
  const [creando, setCreando] = useState(false)
  const [aviso, setAviso] = useState('')
  const consulta = useEntidad(acceso.consulta, editando || creando)
  const edicion = useActualizarEntidad()
  const alta = useCrearEntidad()
  const sinEntidad = !consulta.data && esEntidadAusente(consulta.error)

  async function crear(datos: Valores) {
    const resultado = await alta.registrar(datosCrearEntidad(datos))
    setCreando(false)
    setAviso(resultado === 'creada'
      ? 'La cooperativa se creó correctamente.'
      : 'La cooperativa ya está registrada. Mostramos sus datos actuales; no se ha creado otra ni se han sustituido sus datos.')
  }

  async function guardar(cambios: EntidadPatch) {
    if (!Object.keys(cambios).length) {
      setBaseEdicion(null)
      setAviso('No había cambios para guardar.')
      return
    }

    await edicion.mutateAsync(cambios)
    setBaseEdicion(null)
    setAviso('Los datos de la cooperativa se guardaron correctamente.')
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[32px] leading-tight font-bold tracking-tight text-heading sm:text-[40px]">
            Datos de la cooperativa
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Consulta la información institucional y mantén actualizados sus datos.
          </p>
        </div>
        {acceso.edicion && consulta.isSuccess && consulta.data && !editando && !creando && (
          <Button
            className="min-h-11 rounded-xl"
            onClick={() => {
              void cache.cancelQueries({ queryKey: ENTIDAD_KEY })
              edicion.reset()
              setAviso('')
              setBaseEdicion(consulta.data!)
            }}
          >
            <Pencil />
            Editar datos
          </Button>
        )}
      </header>

      {!acceso.consulta ? (
        <p role="alert" className="rounded-2xl border border-border bg-card p-6">
          No tienes permiso para consultar los datos de la cooperativa.
        </p>
      ) : creando && puedeCrear ? (
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-8">
          <h2 className="mb-2 text-xl font-semibold text-heading">Crear cooperativa</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Registra la información institucional. Este paso se realiza una sola vez.
          </p>
          <EntidadForm
            modo="creacion"
            pendiente={alta.pendiente}
            error={alta.error}
            guardar={crear}
            cancelar={() => { setCreando(false); alta.reset() }}
          />
        </section>
      ) : consulta.isPending ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-border bg-card p-6 text-muted-foreground"
        >
          <LoaderCircle className="size-5 animate-spin" />
          Cargando datos de la cooperativa…
        </p>
      ) : !editando && consulta.isError ? (
        <section
          role={sinEntidad ? 'status' : 'alert'}
          className="flex flex-col items-start gap-4 rounded-2xl border border-border bg-card p-6"
        >
          <Building2 className="size-8 text-muted-foreground" />
          <h2 className="text-xl font-semibold text-heading">
            {sinEntidad ? 'Configura tu cooperativa' : 'No pudimos cargar los datos'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {sinEntidad
              ? (puedeCrear
                ? 'Todavía no se ha registrado la información institucional. Crea la cooperativa para consultar y actualizar sus datos.'
                : 'Todavía no se ha registrado la cooperativa. Solicita a un administrador que complete la configuración inicial.')
              : mensajeErrorEntidad(consulta.error)}
          </p>
          {sinEntidad ? puedeCrear && (
            <Button
              className="min-h-11 rounded-xl"
              onClick={() => { alta.reset(); setAviso(''); setCreando(true) }}
            >
              <Plus />Crear cooperativa
            </Button>
          ) : <Button
            variant="outline"
            disabled={consulta.isFetching}
            onClick={() => void consulta.refetch()}
          >
            Reintentar
          </Button>}
        </section>
      ) : consulta.data && (
        <>
          {aviso && (
            <p role="status" className="rounded-xl border border-border bg-muted p-4 text-sm text-heading">
              {aviso}
            </p>
          )}
          {editando && acceso.edicion ? (
            <section className="rounded-2xl border border-border bg-card p-5 sm:p-8">
              <h2 className="mb-5 text-xl font-semibold text-heading">
                Editar información institucional
              </h2>
              <EntidadForm
                entidad={baseEdicion ?? consulta.data}
                pendiente={edicion.isPending}
                error={edicion.error}
                guardar={guardar}
                cancelar={() => {
                  setBaseEdicion(null)
                  edicion.reset()
                }}
              />
            </section>
          ) : (
            <FichaEntidad entidad={consulta.data} />
          )}
        </>
      )}
    </div>
  )
}

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section
      aria-label={titulo}
      className="rounded-2xl border border-border bg-card p-5 sm:p-6"
    >
      <h2 className="mb-5 border-b border-border pb-3 text-lg font-semibold text-heading">
        {titulo}
      </h2>
      <dl className="grid gap-5 sm:grid-cols-2">{children}</dl>
    </section>
  )
}

function Dato({ label, valor }: { label: string; valor?: string | number | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-base font-medium text-heading">
        {valor === null || valor === undefined || valor === '' ? 'Sin especificar' : valor}
      </dd>
    </div>
  )
}

function FichaEntidad({ entidad: e }: { entidad: Entidad }) {
  return (
    <>
      <EncabezadoEntidad entidad={e} />
      {e.estado === 'I' && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-border bg-muted p-4 text-sm"
        >
          <CircleAlert className="size-5 shrink-0" />
          La cooperativa figura como inactiva en el registro institucional.
        </p>
      )}
      <Bloque titulo="Identificación institucional">
        <Dato label="RUC" valor={e.ruc} />
        <Dato label="Razón social" valor={e.razonSocial} />
        <Dato label="Nombre comercial" valor={e.nombreComercial} />
        <Dato label="Tipo de organización" valor={e.tipoOrganizacion} />
      </Bloque>
      <Bloque titulo="Información institucional">
        <Dato label="Segmento" valor={e.segmento} />
        <Dato label="Número de resolución SEPS" valor={e.numeroResolucionSeps} />
        <Dato label="Fecha de constitución" valor={fechaEntidad(e.fechaConstitucion)} />
      </Bloque>
      <Bloque titulo="Representación legal">
        <Dato label="Representante legal" valor={e.representanteLegal} />
        <Dato label="Identificación del representante" valor={e.identificacionRepresentante} />
      </Bloque>
      <Bloque titulo="Contacto">
        <Dato label="Teléfono" valor={e.telefono} />
        <Dato label="Correo electrónico" valor={e.email} />
        <Dato label="Sitio web" valor={e.sitioWeb} />
      </Bloque>
      <section
        aria-label="Información del registro"
        className="rounded-2xl border border-border bg-card p-5 sm:p-6"
      >
        <h2 className="mb-5 text-lg font-semibold text-heading">Información del registro</h2>
        <dl className="grid gap-5 sm:grid-cols-2">
          <Dato label="Fecha de registro" valor={fechaEntidad(e.fechaRegistro)} />
          <Dato label="Último modificador" valor={`Usuario interno #${e.modificadoPor}`} />
        </dl>
      </section>
    </>
  )
}
