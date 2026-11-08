import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, CircleAlert, LoaderCircle, MapPin, UserRoundX } from 'lucide-react'

import { ApiError } from '@/shared/api'
import { Badge, Button } from '@/shared/ui'
import type { Cliente } from '@/features/clientes/api/clientes.contract'
import { useCliente } from '@/features/clientes/hooks/useConsultaClientes'
import {
  celularVisible,
  formatearFecha,
  nombreVisible,
  parsearIdCliente,
  TIPO_CLIENTE_LABEL,
  TIPO_DOCUMENTO_LABEL,
  varianteEstado,
} from '@/features/clientes/lib/consulta'

/* C-03 · Ficha del cliente (CLI-04): solo lectura. Editarlo o cambiar su estado es C-04. */

export function FichaClientePage() {
  const { idCliente } = useParams()
  const id = parsearIdCliente(idCliente)
  const consulta = useCliente(id)

  const noExiste =
    id === undefined || (consulta.error instanceof ApiError && consulta.error.code === 'CLIENTE_NO_ENCONTRADO')

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Button asChild variant="outline" className="h-10 rounded-xl px-4">
        <Link to="/clientes">
          <ArrowLeft />
          Volver a la búsqueda
        </Link>
      </Button>

      <div className="mt-6">
        {noExiste ? (
          <ClienteNoEncontrado />
        ) : consulta.isError ? (
          <div
            role="alert"
            className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-5 text-sm sm:flex-row sm:items-center"
          >
            <p className="flex flex-1 items-center gap-2 text-destructive">
              <CircleAlert className="size-4 shrink-0" />
              {consulta.error.message}
            </p>
            <Button type="button" variant="outline" onClick={() => void consulta.refetch()}>
              Reintentar
            </Button>
          </div>
        ) : consulta.isPending ? (
          <p role="status" className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <LoaderCircle className="size-5 animate-spin" />
            Cargando la ficha del cliente…
          </p>
        ) : (
          <Ficha cliente={consulta.data} />
        )}
      </div>
    </div>
  )
}

function ClienteNoEncontrado() {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-12 text-center"
    >
      <UserRoundX className="size-8 text-muted-foreground" />
      <p className="font-semibold text-heading">No existe un cliente con ese ID</p>
      <Link to="/clientes" className="text-sm font-semibold text-link underline-offset-4 hover:underline">
        Buscar otro cliente
      </Link>
    </div>
  )
}

function Ficha({ cliente }: { cliente: Cliente }) {
  // La principal primero; el resto en el orden en que llegan
  const direcciones = [...cliente.direcciones].sort((a, b) => Number(b.esPrincipal) - Number(a.esPrincipal))

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">{nombreVisible(cliente)}</h1>
        <Badge variant={varianteEstado(cliente.estado)}>{cliente.estado}</Badge>
      </header>

      <Seccion titulo="Datos del cliente">
        <dl className="grid gap-5 sm:grid-cols-2">
          <Dato etiqueta="Identificación">
            {TIPO_DOCUMENTO_LABEL[cliente.tipoDocumento]} {cliente.identificacion}
          </Dato>
          <Dato etiqueta="Tipo de cliente">{TIPO_CLIENTE_LABEL[cliente.tipoCliente]}</Dato>
          {cliente.tipoCliente === 'Natural' && (
            <Dato etiqueta="Fecha de nacimiento">{formatearFecha(cliente.fechaNacimiento)}</Dato>
          )}
          <Dato etiqueta="Fecha de registro">{formatearFecha(cliente.fechaRegistro)}</Dato>
        </dl>
      </Seccion>

      <Seccion titulo="Contacto">
        <dl className="grid gap-5 sm:grid-cols-2">
          <Dato etiqueta="Correo electrónico">
            <span className="break-all">{cliente.email}</span>
          </Dato>
          <Dato etiqueta="Celular">{celularVisible(cliente.telefonoCelular)}</Dato>
          {cliente.telefonoConvencional && <Dato etiqueta="Teléfono convencional">{cliente.telefonoConvencional}</Dato>}
        </dl>
      </Seccion>

      <Seccion titulo="Direcciones">
        {direcciones.length === 0 ? (
          <p className="text-sm text-muted-foreground">El cliente no tiene direcciones activas.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {direcciones.map((direccion) => (
              <li
                key={direccion.idDireccion}
                className="flex gap-4 rounded-xl border border-border bg-field px-4 py-3"
              >
                <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-heading">
                    {direccion.tipoDireccion}
                    {direccion.esPrincipal && <Badge>Principal</Badge>}
                  </p>
                  <p className="text-sm text-foreground">{direccion.calleDireccion}</p>
                  {direccion.sector && <p className="text-sm text-muted-foreground">Sector: {direccion.sector}</p>}
                  <p className="text-sm text-muted-foreground">Referencia: {direccion.referenciaUbicacion}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Seccion>
    </div>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 className="border-b border-border pb-3 text-lg font-semibold text-heading">{titulo}</h2>
      {children}
    </section>
  )
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-muted-foreground">{etiqueta}</dt>
      <dd className="font-medium text-heading">{children}</dd>
    </div>
  )
}
