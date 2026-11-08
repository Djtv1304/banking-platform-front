import { Link, useParams } from 'react-router'
import { ArrowLeft, Building2, CircleCheck, Mail, Phone, UserRound, UserX } from 'lucide-react'

import { cn } from '@/shared/lib'
import { Button } from '@/shared/ui'
import { CuentasCliente } from '@/features/cuenta'
import type { ClienteDetalle } from '@/features/clientes/api/clientes.contract'
import { useCliente, useDocumentosCliente } from '@/features/clientes/hooks/useClientes'
import { formatearFecha } from '@/features/clientes/lib/documentos'
import { DatosLista } from '@/features/clientes/components/DatosLista'
import { DocumentosCliente } from '@/features/clientes/components/documentos/DocumentosCliente'
import { SubirDocumentoDialog } from '@/features/clientes/components/documentos/SubirDocumentoDialog'

const ETIQUETA_DOCUMENTO = { CEDULA: 'Cédula', RUC: 'RUC', PASAPORTE: 'Pasaporte' } as const

function datosDelCliente(cliente: ClienteDetalle) {
  const comunes = [
    { label: ETIQUETA_DOCUMENTO[cliente.tipoDocumento], valor: cliente.identificacion },
    { label: 'Correo electrónico', valor: cliente.email },
    { label: 'Teléfono celular', valor: cliente.telefonoCelular },
    { label: 'Teléfono convencional', valor: cliente.telefonoConvencional },
    { label: 'Dirección principal', valor: cliente.direccionPrincipal },
  ]
  if (cliente.tipoCliente === 'JURIDICO') {
    return [
      { label: 'Razón social', valor: cliente.razonSocial },
      { label: 'Nombre comercial', valor: cliente.nombreComercial },
      ...comunes,
    ]
  }
  return [
    { label: 'Nombres', valor: cliente.nombres },
    { label: 'Apellidos', valor: cliente.apellidos },
    { label: 'Fecha de nacimiento', valor: cliente.fechaNacimiento && formatearFecha(cliente.fechaNacimiento) },
    { label: 'Nacionalidad', valor: cliente.nacionalidad },
    { label: 'Estado civil', valor: cliente.estadoCivil },
    ...comunes,
  ]
}

/** Ficha del cliente para el personal: datos, cuentas (A-03) y documentos (C-02) */
export function ClienteDetallePage() {
  const idCliente = Number(useParams().idCliente)
  const cliente = useCliente(idCliente)
  const documentos = useDocumentosCliente(idCliente)

  // Volver repite la búsqueda del cliente, para que el resultado siga visible
  const volverA = cliente.data
    ? `/clientes?${new URLSearchParams({ tipo: cliente.data.tipoDocumento, identificacion: cliente.data.identificacion })}`
    : '/clientes'

  if (cliente.isError) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 py-16 text-center">
        <UserX className="size-10 text-muted-foreground" />
        <h1 className="text-2xl font-bold text-heading">No encontramos este cliente</h1>
        <p className="text-muted-foreground">{cliente.error.message}</p>
        <Button asChild variant="outline" className="h-11 rounded-xl px-6">
          <Link to="/clientes">
            <ArrowLeft />
            Volver a la búsqueda
          </Link>
        </Button>
      </div>
    )
  }

  const datos = cliente.data
  const Icono = datos?.tipoCliente === 'JURIDICO' ? Building2 : UserRound
  const activo = datos?.estado === 'ACTIVO'

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <Link
        to={volverA}
        className="flex w-fit items-center gap-2 rounded-md text-sm font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="size-4" />
        Volver a la búsqueda
      </Link>

      {/* Encabezado */}
      <section className="flex flex-col gap-6 rounded-3xl border border-border bg-card p-6 not-dark:shadow-xl not-dark:shadow-brand-ink/5 sm:p-8 lg:flex-row lg:items-center">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-brand-navy-deep text-white">
          <Icono className="size-7" />
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {datos ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-[28px] leading-tight font-bold tracking-tight text-heading">{datos.nombre}</h1>
                <span
                  className={cn(
                    'inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold',
                    activo ? 'bg-info/25 text-foreground' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {activo ? <CircleCheck className="size-3.5" /> : <UserX className="size-3.5" />}
                  {activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="tabular-nums">
                  {ETIQUETA_DOCUMENTO[datos.tipoDocumento]} {datos.identificacion}
                </span>
                <span aria-hidden>·</span>
                <span>{datos.tipoCliente === 'NATURAL' ? 'Persona natural' : 'Persona jurídica'}</span>
                <span aria-hidden>·</span>
                <span>Cliente desde {formatearFecha(datos.fechaRegistro)}</span>
              </p>
            </>
          ) : (
            <span aria-busy="true" className="flex flex-col gap-2">
              <span className="h-7 w-72 max-w-full animate-pulse rounded bg-muted" />
              <span className="h-4 w-56 animate-pulse rounded bg-muted" />
            </span>
          )}
        </div>

        {datos && (
          <div className="flex flex-col gap-2 text-sm lg:items-end">
            <a href={`mailto:${datos.email}`} className="flex items-center gap-2 text-link hover:underline">
              <Mail className="size-4" />
              {datos.email}
            </a>
            <a href={`tel:${datos.telefonoCelular}`} className="flex items-center gap-2 text-link hover:underline">
              <Phone className="size-4" />
              {datos.telefonoCelular}
            </a>
          </div>
        )}
      </section>

      <section aria-labelledby="datos-titulo" className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <h2 id="datos-titulo" className="text-xl font-semibold text-heading">
          Datos del cliente
        </h2>
        <div className="mt-5">
          <DatosLista datos={datos && datosDelCliente(datos)} />
        </div>
      </section>

      <CuentasCliente idCliente={idCliente} />

      <DocumentosCliente
        documentos={documentos.data}
        isPending={documentos.isPending}
        isError={documentos.isError}
        descripcion="Respaldos del cliente organizados por trámite. Sube aquí los documentos que entregue."
        accion={<SubirDocumentoDialog idCliente={idCliente} />}
        mostrarCargadoPor
      />
    </div>
  )
}
