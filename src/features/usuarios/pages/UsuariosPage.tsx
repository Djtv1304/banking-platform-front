import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CircleCheck, UserPlus, X } from 'lucide-react'

import { Aviso, Button, Cargando, Paginacion } from '@/shared/ui'
import { useAuthStore, usePermisos, usePuedeFuncion } from '@/features/auth'
import { mensajeErrorListado } from '@/features/usuarios/api/usuarios.api'
import type { CampoOrden, UsuarioCreado } from '@/features/usuarios/api/usuarios.contract'
import { CrearUsuarioDialog } from '@/features/usuarios/components/CrearUsuarioDialog'
import { FiltrosUsuarios } from '@/features/usuarios/components/FiltrosUsuarios'
import { TablaUsuarios } from '@/features/usuarios/components/TablaUsuarios'
import { useUsuarios } from '@/features/usuarios/hooks/useUsuarios'
import { accesoUsuarios } from '@/features/usuarios/lib/acceso'
import {
  armarParametros,
  filtrosActivos,
  filtrosDesdeRol,
  ORDEN_INICIAL,
  resumenPaginacion,
  siguienteOrden,
  totalPaginas,
  type FiltrosUsuarios as Filtros,
  type Orden,
} from '@/features/usuarios/lib/filtros'
import { nombreCompleto } from '@/features/usuarios/lib/formato'

/** AUT-05 y AUT-06 · Usuarios internos: búsqueda, filtros, orden, paginación y alta con invitación */
export function UsuariosPage() {
  const roles = useAuthStore((state) => state.user?.roles)
  const anterior = accesoUsuarios(roles ?? [], usePermisos())
  const acceso = { consulta: usePuedeFuncion('usuarios.consultar', anterior.consulta), creacion: usePuedeFuncion('usuarios.administrar', anterior.creacion) }
  const [searchParams, setSearchParams] = useSearchParams()

  // Solo el rol puede precargarse por URL; nombres y correos permanecen en memoria.
  const [filtros, setFiltros] = useState<Filtros>(() => filtrosDesdeRol(searchParams.get('rol')))
  const [orden, setOrden] = useState<Orden>(ORDEN_INICIAL)
  const [page, setPage] = useState(1)
  const [creando, setCreando] = useState(false)
  const [creado, setCreado] = useState<UsuarioCreado | null>(null)

  const usuarios = useUsuarios(armarParametros(filtros, orden, page), acceso.consulta)
  const aplicados = filtros.q !== '' || filtrosActivos(filtros) > 0

  const buscar = (nuevos: Filtros) => {
    setFiltros(nuevos)
    setPage(1)
    if (searchParams.has('rol') && searchParams.get('rol') !== nuevos.rol) {
      const actualizados = new URLSearchParams(searchParams)
      actualizados.delete('rol')
      setSearchParams(actualizados, { replace: true })
    }
  }

  const ordenar = (campo: CampoOrden) => {
    setOrden((actual) => siguienteOrden(actual, campo))
    setPage(1)
  }

  if (!acceso.consulta) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <Aviso tono="error">No tienes permiso para gestionar usuarios. Se requiere el rol ADMIN.</Aviso>
      </div>
    )
  }

  const resultado = (() => {
    if (usuarios.isError && !usuarios.data) return <Aviso tono="error">{mensajeErrorListado(usuarios.error)}</Aviso>
    if (usuarios.isPending) return <Cargando texto="Cargando usuarios…" />
    if (usuarios.data.items.length === 0) {
      return (
        <Aviso>
          {aplicados
            ? 'Ningún usuario coincide con la búsqueda o los filtros. Prueba con otros valores o usa «Limpiar».'
            : 'Todavía no hay usuarios internos registrados.'}
        </Aviso>
      )
    }

    const { items, total, pageSize } = usuarios.data
    return (
      <div className="flex flex-col gap-4">
        {usuarios.isError && <Aviso tono="error">{mensajeErrorListado(usuarios.error)}</Aviso>}
        <TablaUsuarios usuarios={items} orden={orden} ocupado={usuarios.isFetching} onOrdenar={ordenar} />
        <Paginacion
          resumen={resumenPaginacion(page, total, pageSize)}
          page={page}
          totalPaginas={totalPaginas(total, pageSize)}
          ocupado={usuarios.isFetching}
          onCambiar={setPage}
        />
      </div>
    )
  })()

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] leading-tight font-bold tracking-tight text-heading sm:text-[40px]">
            Usuarios del sistema
          </h1>
          <p className="mt-2 max-w-2xl text-base text-muted-foreground">
            Crea los usuarios del personal y asígnales el rol y la agencia con los que operarán.
          </p>
        </div>
        {acceso.creacion && (
          <Button onClick={() => setCreando(true)} className="h-[52px] rounded-xl px-6 text-base font-semibold">
            <UserPlus />
            Nuevo usuario
          </Button>
        )}
      </header>

      {creado && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-5 py-4 text-sm text-foreground"
        >
          <CircleCheck className="mt-0.5 size-5 shrink-0 text-link" />
          <p className="flex-1">
            <span className="font-semibold text-heading">{nombreCompleto(creado)}</span> ya tiene usuario{' '}
            <span className="font-semibold text-heading">{creado.username}</span>. Enviamos la invitación a{' '}
            <span className="font-semibold text-heading">{creado.email}</span>; podrá ingresar cuando la acepte y defina su
            contraseña.{' '}
            <Link to={`/usuarios/${creado.idUsuario}`} className="font-semibold text-link underline-offset-4 hover:underline">
              Ver su ficha
            </Link>
          </p>
          <button
            type="button"
            onClick={() => setCreado(null)}
            aria-label="Cerrar aviso"
            className="rounded-md p-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <section className="rounded-3xl border border-border bg-card p-6 not-dark:shadow-xl not-dark:shadow-brand-ink/5 sm:p-8">
        <FiltrosUsuarios buscando={usuarios.isFetching} aplicados={aplicados} onBuscar={buscar} iniciales={filtros} />
      </section>

      <section aria-label="Usuarios" className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        {resultado}
      </section>

      {acceso.creacion && (
        <CrearUsuarioDialog
          open={creando}
          onOpenChange={setCreando}
          onCreado={(usuario) => {
            setCreando(false)
            setCreado(usuario)
          }}
        />
      )}
    </div>
  )
}
