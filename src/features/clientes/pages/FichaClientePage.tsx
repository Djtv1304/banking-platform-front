import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, CircleAlert, LoaderCircle, UserRoundX } from 'lucide-react'

import { ApiError } from '@/shared/api'
import { GestionDirecciones } from '@/features/clientes/components/GestionDirecciones'
import { puedeGestionarDirecciones } from '@/features/clientes/lib/direcciones'
import { Badge, Button } from '@/shared/ui'
import { usePuedeFuncion, useAuthStore, usePermisos } from '@/features/auth'
import { GestionCliente } from '@/features/clientes/components/GestionCliente'
import { HistorialCliente } from '@/features/clientes/components/HistorialCliente'
import { GestionRiesgo } from '@/features/clientes/components/GestionRiesgo'
import { accesoGestionClientes } from '@/features/clientes/lib/gestion-clientes'
import { accesoRiesgo } from '@/features/clientes/api/riesgo'
import { CampoEnmascarado } from '@/features/clientes/components/CampoEnmascarado'
import { IndicadorHabilitacion } from '@/features/clientes/components/IndicadorHabilitacion'
import { useAgencias } from '@/features/catalogos'
import type { Cliente } from '@/features/clientes/api/clientes.contract'
import { useCliente } from '@/features/clientes/hooks/useConsultaClientes'
import {
  formatearFecha,
  nombreVisible,
  parsearIdCliente,
  TIPO_CLIENTE_LABEL,
  TIPO_DOCUMENTO_LABEL,
  varianteEstado,
} from '@/features/clientes/lib/consulta'

/*
 * Compone la ficha de C-03, las acciones de C-04 y la gestión de direcciones C-07.
 * E5-05: documento, correo y teléfonos llegan enmascarados; el valor completo se ve con CampoEnmascarado
 * (MFA y auditoría). Cada sección se muestra según la función del usuario: el cajero ve la ficha
 * reducida (sin direcciones ni riesgo).
 */

const ROLES_HABILITACION = ['ASESOR', 'SUPERVISOR', 'AUDITOR', 'ADMIN']

export function FichaClientePage() {
  const { idCliente } = useParams()
  const id = parsearIdCliente(idCliente)
  const roles = useAuthStore((estado) => estado.user?.roles)
  const permisos = usePermisos()
  const anterior = accesoGestionClientes(roles ?? [], permisos)
  const acceso = {
    consulta: usePuedeFuncion('clientes.consultar', anterior.consulta),
    edicion: usePuedeFuncion('clientes.editar', anterior.edicion),
    estado: usePuedeFuncion('clientes.cambiarEstado', anterior.estado),
    historial: usePuedeFuncion('clientes.verHistorial', anterior.historial),
  }
  const verRiesgo = usePuedeFuncion('clientes.riesgo.consultar', anterior.historial)
  const consulta = useCliente(acceso.consulta ? id : undefined)

  const noExiste =
    id === undefined || (consulta.error instanceof ApiError && consulta.error.code === 'CLIENTE_NO_ENCONTRADO')

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Button asChild variant="outline" className="h-10 rounded-xl px-4">
        <Link to={acceso.consulta ? '/clientes-busqueda' : '/'}>
          <ArrowLeft />
          {acceso.consulta ? 'Volver a la búsqueda' : 'Volver al inicio'}
        </Link>
      </Button>

      <div className="mt-6">
        {noExiste ? (
          <ClienteNoEncontrado />
        ) : !acceso.consulta ? (
          (acceso.historial || verRiesgo) ? <div className="flex flex-col gap-6"><h1 className="text-3xl font-bold text-heading">Historial del cliente #{id}</h1>{acceso.historial && <HistorialCliente key={id} id={id!} />}{verRiesgo && <GestionRiesgo key={`riesgo-${id}`} id={id!} nombre={`cliente #${id}`} />}</div> : <p role="alert">No tienes permiso para consultar este cliente.</p>
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
      <Link to="/clientes-busqueda" className="text-sm font-semibold text-link underline-offset-4 hover:underline">
        Buscar otro cliente
      </Link>
    </div>
  )
}

function Ficha({ cliente }: { cliente: Cliente }) {
  const gestion = usePuedeFuncion('clientes.direcciones.gestionar', puedeGestionarDirecciones(usePermisos()))
  const verDirecciones = usePuedeFuncion('clientes.direcciones.consultar', gestion)
  const roles = useAuthStore((estado) => estado.user?.roles)
  const verRiesgo = usePuedeFuncion('clientes.riesgo.consultar', accesoRiesgo(roles ?? [], usePermisos()).historial)
  // Mismos roles que GET /clientes/{id}/habilitacion: el cajero no la consulta (ficha reducida).
  const verHabilitacion = (roles ?? []).some((rol) => ROLES_HABILITACION.includes(rol.trim().toUpperCase()))
  const agencias = useAgencias()
  const agencia = agencias.data.find((item) => item.idAgencia === cliente.idAgenciaRegistro)
  const id = cliente.idCliente
  const secciones = [
    { id: 'ficha-identidad', titulo: 'Identidad' },
    { id: 'ficha-contacto', titulo: 'Contacto' },
    ...(verDirecciones ? [{ id: 'ficha-direcciones', titulo: 'Direcciones' }] : []),
    ...(verRiesgo ? [{ id: 'riesgo-titulo', titulo: 'Riesgo' }] : []),
    { id: 'ficha-productos', titulo: 'Productos' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">{nombreVisible(cliente)}</h1>
        <Badge variant={varianteEstado(cliente.estado)}>{cliente.estado}</Badge>
      </header>

      <nav aria-label="Secciones de la ficha" className="flex flex-wrap gap-2">
        {secciones.map((seccion) => (
          <a key={seccion.id} href={`#${seccion.id}`}
            className="rounded-full border border-border px-3 py-1 text-sm font-medium text-heading hover:bg-muted">
            {seccion.titulo}
          </a>
        ))}
      </nav>

      <GestionCliente key={id} cliente={cliente} />

      <Seccion id="ficha-identidad" titulo="Identidad">
        <dl className="grid gap-5 sm:grid-cols-2">
          <Dato etiqueta={`Documento (${TIPO_DOCUMENTO_LABEL[cliente.tipoDocumento]})`}>
            <CampoEnmascarado idCliente={id} campo="identificacion" valor={cliente.identificacion} etiqueta="el documento" />
          </Dato>
          <Dato etiqueta="Tipo de cliente">{TIPO_CLIENTE_LABEL[cliente.tipoCliente]}</Dato>
          {cliente.tipoCliente === 'Natural' && (
            <Dato etiqueta="Fecha de nacimiento">{formatearFecha(cliente.fechaNacimiento)}</Dato>
          )}
          <Dato etiqueta="Fecha de registro">{formatearFecha(cliente.fechaRegistro)}</Dato>
          <Dato etiqueta="Agencia de registro">
            {cliente.idAgenciaRegistro ? `${cliente.idAgenciaRegistro}${agencia ? ` · ${agencia.nombre}` : ''}` : 'Sin agencia registrada'}
          </Dato>
        </dl>
      </Seccion>

      <Seccion id="ficha-contacto" titulo="Contacto">
        <dl className="grid gap-5 sm:grid-cols-2">
          <Dato etiqueta="Correo electrónico">
            <CampoEnmascarado idCliente={id} campo="email" valor={cliente.email} etiqueta="el correo" />
          </Dato>
          <Dato etiqueta="Celular">
            <CampoEnmascarado idCliente={id} campo="telefonoCelular" valor={cliente.telefonoCelular} etiqueta="el celular" />
          </Dato>
          {cliente.telefonoConvencional && (
            <Dato etiqueta="Teléfono convencional">
              <CampoEnmascarado idCliente={id} campo="telefonoConvencional" valor={cliente.telefonoConvencional} etiqueta="el teléfono convencional" />
            </Dato>
          )}
        </dl>
      </Seccion>

      {verDirecciones && (
        <Seccion id="ficha-direcciones" titulo="Direcciones">
          <GestionDirecciones
            idCliente={id}
            soloLectura={!gestion || cliente.estado === 'Eliminado'}
          />
        </Seccion>
      )}

      {verRiesgo && <GestionRiesgo key={`riesgo-${id}`} id={id} nombre={nombreVisible(cliente)} estado={cliente.estado} />}

      {verHabilitacion && (
        <Seccion id="ficha-productos" titulo="Productos">
          <IndicadorHabilitacion idCliente={id} />
        </Seccion>
      )}
    </div>
  )
}

function Seccion({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 id={id} className="scroll-mt-6 border-b border-border pb-3 text-lg font-semibold text-heading">{titulo}</h2>
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
