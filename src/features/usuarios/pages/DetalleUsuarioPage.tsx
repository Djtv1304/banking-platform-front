import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, CircleCheck, RefreshCw, X } from 'lucide-react'

import { cn } from '@/shared/lib'
import { Aviso, Button, Cargando } from '@/shared/ui'
import { useAuthStore, usePermisos, usePuedeFuncion } from '@/features/auth'
import { mensajeErrorDetalle } from '@/features/usuarios/api/usuarios.api'
import type { UsuarioDetalle } from '@/features/usuarios/api/usuarios.contract'
import { AccesoUsuario } from '@/features/usuarios/components/detalle/AccesoUsuario'
import { DatosPersonales } from '@/features/usuarios/components/detalle/DatosPersonales'
import { RolYAgencia } from '@/features/usuarios/components/detalle/RolYAgencia'
import { EstadoUsuarioBadge } from '@/features/usuarios/components/EstadoUsuarioBadge'
import { SeguimientoCambioUsuario } from '@/features/usuarios/components/detalle/SeguimientoCambioUsuario'
import { useUsuario } from '@/features/usuarios/hooks/useUsuarios'
import { accesoUsuarios } from '@/features/usuarios/lib/acceso'
import { leerIdUsuario } from '@/features/usuarios/lib/filtros'
import { iniciales, nombreCompleto, tonoEstado } from '@/features/usuarios/lib/formato'

/** AUT-07 (ficha), AUT-08 (datos, agencia y estado) y AUT-09 (rol) de un usuario interno */
export function DetalleUsuarioPage() {
  const { idUsuario: param } = useParams()
  const idUsuario = leerIdUsuario(param)
  const roles = useAuthStore((state) => state.user?.roles)
  const idSesion = useAuthStore((state) => state.user?.idUsuario)
  const emailSesion = useAuthStore((state) => state.user?.email)
  const anterior = accesoUsuarios(roles ?? [], usePermisos())
  const acceso = { consulta: usePuedeFuncion('usuarios.consultar', anterior.consulta), creacion: usePuedeFuncion('usuarios.administrar', anterior.creacion) }
  const usuario = useUsuario(idUsuario, acceso.consulta)

  const contenido = (() => {
    if (!acceso.consulta) {
      return <Aviso tono="error">No tienes permiso para gestionar usuarios. Se requiere el rol ADMIN.</Aviso>
    }
    if (idUsuario === null) return <Aviso>No existe un usuario con ese ID. Puede que el enlace esté incompleto.</Aviso>
    if (usuario.isPending) return <Cargando texto="Cargando la ficha del usuario…" />
    if (usuario.isError && !usuario.data) {
      return (
        <Aviso tono="error">
          {mensajeErrorDetalle(usuario.error)}
          <Button variant="outline" size="sm" disabled={usuario.isFetching} onClick={() => void usuario.refetch()} className="w-fit">
            <RefreshCw className={cn(usuario.isFetching && 'animate-spin')} />
            Reintentar
          </Button>
        </Aviso>
      )
    }
    if (!usuario.data) return null
    const esPropio = idSesion === String(usuario.data.idUsuario) || (!!emailSesion && emailSesion.trim().toLowerCase() === usuario.data.email.trim().toLowerCase())
    return <FichaUsuario key={usuario.data.idUsuario} usuario={usuario.data} esPropio={esPropio} actualizando={usuario.isFetching} />
  })()

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <Button asChild variant="ghost" size="lg" className="-ml-2.5 w-fit rounded-lg text-muted-foreground">
        <Link to="/usuarios">
          <ArrowLeft />
          Usuarios del sistema
        </Link>
      </Button>
      {contenido}
    </div>
  )
}

function FichaUsuario({ usuario, esPropio, actualizando }: { usuario: UsuarioDetalle; esPropio: boolean; actualizando: boolean }) {
  const [aviso, setAviso] = useState<string | null>(null)
  const tono = tonoEstado(usuario.estado)

  return (
    <>
      <header className="flex flex-wrap items-center gap-5">
        <span
          aria-hidden
          className={cn(
            'flex size-16 shrink-0 items-center justify-center rounded-2xl text-xl font-bold tracking-wide sm:size-[72px] sm:text-2xl',
            tono === 'activo' ? 'bg-brand-navy-deep text-white' : 'bg-muted text-muted-foreground',
          )}
        >
          {iniciales(usuario)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h1 className="text-[28px] leading-tight font-bold tracking-tight break-words text-heading sm:text-[36px]">
            {nombreCompleto(usuario)}
          </h1>
          <div className="flex flex-wrap items-center gap-2.5 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{usuario.username}</span>
            <EstadoUsuarioBadge estado={usuario.estado} />
            {esPropio && <Etiqueta>Tu usuario</Etiqueta>}
            {actualizando && (
              <span className="flex items-center gap-1.5" role="status">
                <RefreshCw aria-hidden className="size-3.5 animate-spin" />
                Actualizando
              </span>
            )}
          </div>
        </div>
      </header>

      <SeguimientoCambioUsuario idUsuario={usuario.idUsuario} onConfirmado={setAviso} />

      {aviso && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-5 py-4 text-sm text-foreground">
          <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-link" />
          <p className="flex-1">{aviso}</p>
          <button
            type="button"
            onClick={() => setAviso(null)}
            aria-label="Cerrar aviso"
            className="rounded-md p-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <DatosPersonales usuario={usuario} onGuardado={setAviso} />
          <RolYAgencia usuario={usuario} esPropio={esPropio} onGuardado={setAviso} />
        </div>
        <div className="lg:sticky lg:top-0">
          <AccesoUsuario usuario={usuario} esPropio={esPropio} onGuardado={setAviso} />
        </div>
      </div>
    </>
  )
}

function Etiqueta({ children }: { children: ReactNode }) {
  return <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">{children}</span>
}
