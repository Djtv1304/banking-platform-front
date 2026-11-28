import { DocumentosCliente } from '@/features/clientes/components/DocumentosCliente'
import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { Tabs } from 'radix-ui'
import { ArrowLeft, CircleAlert, LoaderCircle, UserRoundX } from 'lucide-react'

import { ApiError } from '@/shared/api'
import { GestionDirecciones } from '@/features/clientes/components/GestionDirecciones'
import { FirmantesCliente } from '@/features/clientes/components/FirmantesCliente'
import { TutorCliente } from '@/features/clientes/components/TutorCliente'
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
import { PestanaHistorial } from '@/features/auditoria'

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
          (acceso.historial || verRiesgo) ? <div className="flex flex-col gap-6"><h1 className="text-3xl font-bold text-heading">Historial del cliente #{id}</h1>{acceso.historial && <HistorialCliente key={id} id={id!} />}<PestanaHistorial key={`auditoria-${id}`} tipo="Clientes.Cliente" id={id!} />{verRiesgo && <GestionRiesgo key={`riesgo-${id}`} id={id!} nombre={`cliente #${id}`} />}</div> : <p role="alert">No tienes permiso para consultar este cliente.</p>
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
          <Ficha key={consulta.data.idCliente} cliente={consulta.data} editarFirmantes={acceso.edicion} />
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

function Ficha({ cliente, editarFirmantes }: { cliente: Cliente; editarFirmantes: boolean }) {
  const ubicacion = useLocation()
  const navegar = useNavigate()
  const gestion = usePuedeFuncion('clientes.direcciones.gestionar', puedeGestionarDirecciones(usePermisos()))
  const verDirecciones = usePuedeFuncion('clientes.direcciones.consultar', gestion)
  const roles = useAuthStore((estado) => estado.user?.roles)
  const editarDocumentos = usePuedeFuncion('clientes.editar', gestion)
  const verDocumentos = usePuedeFuncion(
    'clientes.consultar', (roles ?? []).some((rol) => ['ASESOR', 'CAJERO', 'SUPERVISOR', 'ADMIN'].includes(rol.toUpperCase())),
  )

  const verRiesgo = usePuedeFuncion('clientes.riesgo.consultar', accesoRiesgo(roles ?? [], usePermisos()).historial)
  // Mismos roles que GET /clientes/{id}/habilitacion: el cajero no la consulta (ficha reducida).
  const verHabilitacion = (roles ?? []).some((rol) => ROLES_HABILITACION.includes(rol.trim().toUpperCase()))
  const agencias = useAgencias()
  const agencia = agencias.data.find((item) => item.idAgencia === cliente.idAgenciaRegistro)
  const id = cliente.idCliente
  const fichaCompleta = (roles ?? []).some(rol => ['ASESOR', 'SUPERVISOR', 'ADMIN'].includes(rol))
  const secciones = [
    { id: 'ficha-identidad', titulo: 'Identidad' },
    ...(verDocumentos ? [{ id: 'ficha-documentos', titulo: 'Documentos' }] : []),
    { id: 'ficha-contacto', titulo: 'Contacto' },
    ...(fichaCompleta ? [{ id: 'ficha-relacionados', titulo: 'Relacionados' }] : []),
    ...(verDirecciones ? [{ id: 'ficha-direcciones', titulo: 'Direcciones' }] : []),
    ...(verRiesgo ? [{ id: 'riesgo-titulo', titulo: 'Riesgo' }] : []),
    ...(verHabilitacion ? [{ id: 'ficha-productos', titulo: 'Productos' }] : []),
  ]
  const pedida = ubicacion.hash.slice(1)
  const seleccionada = secciones.some(({ id }) => id === pedida) ? pedida : 'ficha-identidad'

  return (
    <div className="flex flex-col gap-6">
      <GestionCliente key={id} cliente={cliente}>
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h1 className="text-3xl leading-tight font-bold tracking-tight break-words text-heading sm:text-[40px]">{nombreVisible(cliente)}</h1>
          <Badge variant={varianteEstado(cliente.estado)}>{cliente.estado}</Badge>
        </div>
      </GestionCliente>

      <Tabs.Root value={seleccionada} activationMode="manual" className="min-w-0 rounded-2xl border border-border bg-card"
        onValueChange={valor => void navegar(
          { pathname: ubicacion.pathname, search: ubicacion.search, hash: `#${valor}` },
          { replace: true, preventScrollReset: true },
        )}>
      <Tabs.List aria-label="Secciones de la ficha" className="flex gap-1 overflow-x-auto rounded-t-2xl border-b border-border bg-muted/35 px-3 pt-2">
        {secciones.map((seccion) => (
          <Tabs.Trigger key={seccion.id} value={seccion.id}
            className="min-h-11 shrink-0 border-b-2 border-transparent px-3 text-sm font-semibold whitespace-nowrap text-muted-foreground hover:text-heading focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring data-[state=active]:border-primary data-[state=active]:bg-card data-[state=active]:text-heading">
            {seccion.titulo}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      <Seccion id="ficha-identidad" titulo="Identidad" conservar={false}>
        <dl className="grid gap-5 sm:grid-cols-2">
          <Dato etiqueta={`Documento (${TIPO_DOCUMENTO_LABEL[cliente.tipoDocumento] ?? cliente.tipoDocumento})`}>
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

      {verDocumentos && (
        <Seccion id="ficha-documentos" titulo="Documentos">
          <DocumentosCliente key={id} idCliente={id} editar={editarDocumentos && cliente.estado !== 'Eliminado'} />
        </Seccion>
      )}

      <Seccion id="ficha-contacto" titulo="Contacto" conservar={false}>
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

      {fichaCompleta && <Seccion id="ficha-relacionados" titulo="Relacionados">
        {cliente.tipoCliente === 'Natural' && <TutorCliente
          key={`tutor-${id}`} id={id} titular={nombreVisible(cliente)}
          editable={editarFirmantes && cliente.estado !== 'Eliminado'}
        />}
        <FirmantesCliente key={id} id={id} editable={editarFirmantes && cliente.estado !== 'Eliminado'} />
      </Seccion>}

      {verRiesgo && <Seccion id="riesgo-titulo">
        <GestionRiesgo key={`riesgo-${id}`} id={id} nombre={nombreVisible(cliente)} estado={cliente.estado} />
      </Seccion>}

      {verHabilitacion && (
        <Seccion id="ficha-productos" titulo="Productos">
          <IndicadorHabilitacion idCliente={id} />
        </Seccion>
      )}
      </Tabs.Root>
    </div>
  )
}

function Seccion({ id, titulo, children, conservar = true }: {
  id: string; titulo?: string; children: ReactNode; conservar?: boolean
}) {
  return (
    <Tabs.Content value={id} forceMount={conservar ? true : undefined}
      className="flex min-w-0 flex-col gap-5 p-5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring data-[state=inactive]:hidden sm:p-6">
      {titulo && <h2 className="text-lg font-semibold text-heading">{titulo}</h2>}
      {children}
    </Tabs.Content>
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
