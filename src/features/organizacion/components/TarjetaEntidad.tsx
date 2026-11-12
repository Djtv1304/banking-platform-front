import type { ReactNode } from 'react'

import { cn } from '@/shared/lib'
import { Badge } from '@/shared/ui'
import type { Entidad } from '@/features/organizacion/api/entidad.contract'
import {
  etiquetaEstadoEntidad,
  textoFechaConstitucion,
  textoFechaRegistro,
  textoOpcional,
} from '@/features/organizacion/lib/entidad-texto'

interface TarjetaEntidadProps {
  entidad: Entidad
  /** Acciones según el rol (editar) */
  children?: ReactNode
}

/** Datos de la entidad (GET) en modo lectura */
export function TarjetaEntidad({ entidad, children }: TarjetaEntidadProps) {
  return (
    <article aria-labelledby="entidad-razon-social" className="flex flex-col gap-6 rounded-3xl border border-border bg-card p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="entidad-razon-social" className="text-lg font-semibold text-heading">
            {entidad.razonSocial}
          </h2>
          <p className="text-sm text-muted-foreground">RUC {entidad.ruc}</p>
        </div>
        <Badge
          className={cn(
            'h-6 px-2.5',
            entidad.estado === 'A' ? 'bg-primary/15 text-foreground' : 'bg-muted text-muted-foreground',
          )}
        >
          {etiquetaEstadoEntidad(entidad.estado)}
        </Badge>
      </header>

      <Seccion titulo="Datos generales">
        <Dato label="RUC">{entidad.ruc}</Dato>
        <Dato label="Razón social">{entidad.razonSocial}</Dato>
        <Dato label="Nombre comercial">{textoOpcional(entidad.nombreComercial)}</Dato>
        <Dato label="Tipo de organización">{entidad.tipoOrganizacion}</Dato>
        <Dato label="Segmento">{textoOpcional(entidad.segmento)}</Dato>
        <Dato label="Resolución SEPS">{textoOpcional(entidad.numeroResolucionSeps)}</Dato>
        <Dato label="Fecha de constitución">{textoFechaConstitucion(entidad.fechaConstitucion)}</Dato>
        <Dato label="Fecha de registro">{textoFechaRegistro(entidad.fechaRegistro)}</Dato>
      </Seccion>

      <Seccion titulo="Representante legal">
        <Dato label="Nombre">{entidad.representanteLegal}</Dato>
        <Dato label="Identificación">{entidad.identificacionRepresentante}</Dato>
      </Seccion>

      <Seccion titulo="Contacto">
        <Dato label="Teléfono">{textoOpcional(entidad.telefono)}</Dato>
        <Dato label="Correo electrónico">{textoOpcional(entidad.email)}</Dato>
        <Dato label="Sitio web">{textoOpcional(entidad.sitioWeb)}</Dato>
      </Seccion>

      {children && <div className="flex flex-wrap gap-2 border-t border-border pt-4">{children}</div>}
    </article>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section aria-label={titulo} className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-heading">{titulo}</h3>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>
    </section>
  )
}

function Dato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium break-words text-heading">{children}</dd>
    </div>
  )
}
