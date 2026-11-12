import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, CircleAlert, LoaderCircle, Pencil } from 'lucide-react'
import { useAuthStore } from '@/features/auth'
import { ApiError } from '@/shared/api'
import { Badge, Button } from '@/shared/ui'
import { accesoEntidad, editarEntidad, ENTIDAD_KEY, mensajeErrorEntidad, obtenerEntidad, type Entidad, type EntidadPatch } from '@/features/organizacion/api/entidad'
import { EntidadForm } from '@/features/organizacion/components/EntidadForm'
import { fechaEntidad } from '@/features/organizacion/lib/entidad-form'

export function DatosCooperativaPage() {
  const roles = useAuthStore((store) => store.user?.roles)
  const acceso = accesoEntidad(roles ?? [])
  const cache = useQueryClient()
  const [baseEdicion, setBaseEdicion] = useState<Entidad | null>(null)
  const editando = baseEdicion !== null
  const [aviso, setAviso] = useState('')
  const consulta = useQuery({ queryKey: ENTIDAD_KEY, queryFn: ({ signal }) => obtenerEntidad(signal), enabled: acceso.consulta, retry: false, refetchOnWindowFocus: !editando })
  const edicion = useMutation({ mutationFn: editarEntidad, retry: false, onSuccess: async (datos) => { await cache.cancelQueries({ queryKey: ENTIDAD_KEY }); cache.setQueryData(ENTIDAD_KEY, datos); setBaseEdicion(null); setAviso('Los datos de la cooperativa se guardaron correctamente.') } })
  const sinEntidad = consulta.error instanceof ApiError && consulta.error.status === 404 && consulta.error.code === 'ENTIDAD_NO_ENCONTRADA'

  async function guardar(cambios: EntidadPatch) {
    if (!Object.keys(cambios).length) { setBaseEdicion(null); setAviso('No había cambios para guardar.'); return }
    await edicion.mutateAsync(cambios)
  }

  return <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-[32px] leading-tight font-bold tracking-tight text-heading sm:text-[40px]">Datos de la cooperativa</h1><p className="mt-2 text-base text-muted-foreground">Consulta la información institucional y mantén actualizados sus datos.</p></div>
      {acceso.edicion && consulta.isSuccess && consulta.data && !editando && <Button className="min-h-11 rounded-xl" onClick={() => { void cache.cancelQueries({ queryKey: ENTIDAD_KEY }); edicion.reset(); setAviso(''); setBaseEdicion(consulta.data!) }}><Pencil />Editar datos</Button>}
    </header>
    {!acceso.consulta ? <p role="alert" className="rounded-2xl border border-border bg-card p-6">No tienes permiso para consultar los datos de la cooperativa.</p>
      : consulta.isPending ? <p role="status" className="flex items-center gap-2 rounded-2xl border border-border bg-card p-6 text-muted-foreground"><LoaderCircle className="size-5 animate-spin" />Cargando datos de la cooperativa…</p>
      : !editando && consulta.isError ? <section role={sinEntidad ? 'status' : 'alert'} className="flex flex-col items-start gap-4 rounded-2xl border border-border bg-card p-6">
        <Building2 className="size-8 text-muted-foreground" /><h2 className="text-xl font-semibold text-heading">{sinEntidad ? 'Cooperativa pendiente de configuración' : 'No pudimos cargar los datos'}</h2>
        <p className="text-sm text-muted-foreground">{sinEntidad ? 'Todavía no se ha cargado el registro institucional. Su configuración inicial se realiza al preparar el sistema.' : mensajeErrorEntidad(consulta.error)}</p>
        <Button variant="outline" disabled={consulta.isFetching} onClick={() => void consulta.refetch()}>Reintentar</Button>
      </section>
      : consulta.data && <>
        {aviso && <p role="status" className="rounded-xl border border-border bg-muted p-4 text-sm text-heading">{aviso}</p>}
        {editando && acceso.edicion ? <section className="rounded-2xl border border-border bg-card p-5 sm:p-8"><h2 className="mb-5 text-xl font-semibold text-heading">Editar información institucional</h2>
          <EntidadForm entidad={baseEdicion ?? consulta.data} pendiente={edicion.isPending} error={edicion.error} guardar={guardar} cancelar={() => { setBaseEdicion(null); edicion.reset() }} />
        </section> : <FichaEntidad entidad={consulta.data} />}
      </>}
  </div>
}

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return <section aria-label={titulo} className="rounded-2xl border border-border bg-card p-5 sm:p-6"><h2 className="mb-5 border-b border-border pb-3 text-lg font-semibold text-heading">{titulo}</h2><dl className="grid gap-5 sm:grid-cols-2">{children}</dl></section>
}
function Dato({ label, valor }: { label: string; valor?: string | number | null }) {
  return <div className="min-w-0"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-base font-medium text-heading">{valor === null || valor === undefined || valor === '' ? 'Sin especificar' : valor}</dd></div>
}
function FichaEntidad({ entidad: e }: { entidad: Entidad }) {
  return <>
    {e.estado === 'I' && <p role="status" className="flex items-center gap-2 rounded-xl border border-border bg-muted p-4 text-sm"><CircleAlert className="size-5 shrink-0" />La cooperativa figura como inactiva en el registro institucional.</p>}
    <Bloque titulo="Identificación institucional"><Dato label="RUC" valor={e.ruc} /><Dato label="Razón social" valor={e.razonSocial} /><Dato label="Nombre comercial" valor={e.nombreComercial} /><Dato label="Tipo de organización" valor={e.tipoOrganizacion} /></Bloque>
    <Bloque titulo="Información institucional"><Dato label="Segmento" valor={e.segmento} /><Dato label="Número de resolución SEPS" valor={e.numeroResolucionSeps} /><Dato label="Fecha de constitución" valor={fechaEntidad(e.fechaConstitucion)} /></Bloque>
    <Bloque titulo="Representación legal"><Dato label="Representante legal" valor={e.representanteLegal} /><Dato label="Identificación del representante" valor={e.identificacionRepresentante} /></Bloque>
    <Bloque titulo="Contacto"><Dato label="Teléfono" valor={e.telefono} /><Dato label="Correo electrónico" valor={e.email} /><Dato label="Sitio web" valor={e.sitioWeb} /></Bloque>
    <section aria-label="Información del registro" className="rounded-2xl border border-border bg-card p-5 sm:p-6"><h2 className="mb-5 text-lg font-semibold text-heading">Información del registro</h2><dl className="grid gap-5 sm:grid-cols-2"><div><dt className="text-sm text-muted-foreground">Estado</dt><dd className="mt-1"><Badge variant={e.estado === 'A' ? 'default' : 'outline'}>{e.estado === 'A' ? 'Activa' : 'Inactiva'}</Badge></dd></div><Dato label="Fecha de registro" valor={fechaEntidad(e.fechaRegistro)} /><Dato label="Último modificador" valor={`Usuario interno #${e.modificadoPor}`} /></dl></section>
  </>
}
