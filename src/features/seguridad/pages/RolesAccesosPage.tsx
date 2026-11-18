import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRight, KeyRound, ListChecks, ShieldCheck, Users } from 'lucide-react'

import { formatRol, hasAnyRole, useAuthStore } from '@/features/auth'
import { AsignacionPermisos } from '@/features/seguridad/components/AsignacionPermisos'
import { CatalogoPermisos } from '@/features/seguridad/components/CatalogoPermisos'
import { ROLES_CONSULTA_ROLES, type SeccionAccesoRol } from '@/features/seguridad/lib/acceso'
import { Aviso, Badge, Button } from '@/shared/ui'
import { cn } from '@/shared/lib'

interface RolesAccesosPageProps {
  roles: readonly string[]
  seccionesParaRol: (rol: string) => SeccionAccesoRol[]
}

type Vista = { tipo: 'rol'; rol: string } | { tipo: 'catalogo' } | { tipo: 'asignacion' }

function OpcionLateral({ activa, onClick, children }: { activa: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={activa}
      onClick={onClick}
      className={cn(
        'flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
        activa ? 'bg-primary/10 font-semibold text-heading' : 'text-muted-foreground hover:bg-muted/60 hover:text-heading',
      )}
    >
      {children}
      {activa && <ArrowRight aria-hidden className="size-4 shrink-0 text-link" />}
    </button>
  )
}

/** Solo org-admin: opciones del menú de cada rol y permisos de WorkOS (catálogo y asignación a roles). */
export function RolesAccesosPage({ roles, seccionesParaRol }: RolesAccesosPageProps) {
  const actuales = useAuthStore((state) => state.user?.roles)
  const [vista, setVista] = useState<Vista>({ tipo: 'rol', rol: roles[0] ?? '' })

  if (!hasAnyRole(actuales ?? [], ROLES_CONSULTA_ROLES)) {
    return <Aviso tono="error">Solo un administrador puede administrar los roles y accesos del personal.</Aviso>
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] leading-tight font-bold tracking-tight text-heading sm:text-[40px]">Roles y accesos</h1>
          <p className="mt-2 max-w-2xl text-base text-muted-foreground">
            Revisa qué muestra la aplicación a cada rol y administra los permisos.
          </p>
        </div>
        <Badge variant="secondary" className="h-7 gap-1.5 px-3 text-sm">
          <ShieldCheck aria-hidden className="size-4" />
          {roles.length} roles del sistema
        </Badge>
      </header>

      <Aviso>
        Para elegir qué pestañas ve cada rol usa «Pestañas por rol». Para cambiar el rol de una persona, abre su ficha en Usuarios del sistema.
      </Aviso>

      {roles.length === 0 ? (
        <Aviso>No hay roles disponibles para consultar.</Aviso>
      ) : (
        <div className="grid min-w-0 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="flex flex-col gap-6 self-start">
            <section aria-labelledby="roles-sistema" className="rounded-3xl border border-border bg-card p-5 sm:p-6">
              <h2 id="roles-sistema" className="mb-4 text-lg font-semibold text-heading">Roles del sistema</h2>
              <ul className="flex flex-col gap-1.5">
                {roles.map((rol) => (
                  <li key={rol}>
                    <OpcionLateral activa={vista.tipo === 'rol' && vista.rol === rol} onClick={() => setVista({ tipo: 'rol', rol })}>
                      {formatRol(rol)}
                    </OpcionLateral>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="bloque-permisos" className="rounded-3xl border border-border bg-card p-5 sm:p-6">
              <h2 id="bloque-permisos" className="mb-4 text-lg font-semibold text-heading">Permisos</h2>
              <ul className="flex flex-col gap-1.5">
                <li>
                  <OpcionLateral activa={vista.tipo === 'catalogo'} onClick={() => setVista({ tipo: 'catalogo' })}>
                    <span className="flex items-center gap-2"><KeyRound aria-hidden className="size-4" />Catálogo</span>
                  </OpcionLateral>
                </li>
                <li>
                  <OpcionLateral activa={vista.tipo === 'asignacion'} onClick={() => setVista({ tipo: 'asignacion' })}>
                    <span className="flex items-center gap-2"><ListChecks aria-hidden className="size-4" />Asignación</span>
                  </OpcionLateral>
                </li>
              </ul>
            </section>
          </div>

          <section aria-label="Detalle" className="min-w-0 rounded-3xl border border-border bg-card p-6 not-dark:shadow-xl not-dark:shadow-brand-ink/5 sm:p-8">
            {vista.tipo === 'catalogo' ? (
              <CatalogoPermisos />
            ) : vista.tipo === 'asignacion' ? (
              <AsignacionPermisos roles={roles} />
            ) : (
              <DetalleRol rol={vista.rol} secciones={seccionesParaRol(vista.rol)} />
            )}
          </section>
        </div>
      )}
    </div>
  )
}

function DetalleRol({ rol, secciones }: { rol: string; secciones: SeccionAccesoRol[] }) {
  const cantidad = secciones.reduce((total, seccion) => total + seccion.opciones.length, 0)
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-heading">{formatRol(rol)}</h2>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            {cantidad} {cantidad === 1 ? 'opción visible' : 'opciones visibles'} en el menú.
          </p>
        </div>
        <Button asChild variant="outline" className="min-h-11 rounded-xl">
          <Link to={`/usuarios?${new URLSearchParams({ rol })}`}>
            <Users aria-hidden />
            Ver usuarios de este rol
          </Link>
        </Button>
      </div>

      <p className="mt-6 border-t border-border pt-5 text-sm text-muted-foreground">
        Opciones del menú según la configuración actual. Las acciones de cada pantalla también dependen del rol y del estado del registro.
      </p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {secciones.map((seccion) => (
          <div key={seccion.titulo} className="rounded-2xl border border-border p-4">
            <h3 className="text-sm font-semibold text-heading">{seccion.titulo}</h3>
            <ul className="mt-3 flex flex-col gap-2.5">
              {seccion.opciones.map((opcion) => (
                <li key={opcion.titulo} className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>{opcion.titulo}</span>
                  {opcion.enPreparacion && <Badge variant="secondary">En preparación</Badge>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  )
}
