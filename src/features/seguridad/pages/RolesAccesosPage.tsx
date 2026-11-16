import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, ShieldCheck, Users } from 'lucide-react'

import { formatRol, hasAnyRole, useAuthStore } from '@/features/auth'
import { ROLES_CONSULTA_ROLES, type SeccionAccesoRol } from '@/features/seguridad/lib/acceso'
import { Aviso, Badge, Button } from '@/shared/ui'
import { cn } from '@/shared/lib'

interface RolesAccesosPageProps {
  roles: readonly string[]
  seccionesParaRol: (rol: string) => SeccionAccesoRol[]
}

/** Consulta la configuración de navegación; no modifica roles ni accesos. */
export function RolesAccesosPage({ roles, seccionesParaRol }: RolesAccesosPageProps) {
  const actuales = useAuthStore((state) => state.user?.roles)
  const [seleccionado, setSeleccionado] = useState(roles[0] ?? '')

  if (!hasAnyRole(actuales ?? [], ROLES_CONSULTA_ROLES)) {
    return <Aviso tono="error">Solo un administrador puede consultar los roles y accesos del personal.</Aviso>
  }

  const secciones = seccionesParaRol(seleccionado)
  const cantidad = secciones.reduce((total, seccion) => total + seccion.opciones.length, 0)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] leading-tight font-bold tracking-tight text-heading sm:text-[40px]">Roles y accesos</h1>
          <p className="mt-2 max-w-2xl text-base text-muted-foreground">
            Consulta los roles del personal y las opciones que muestra la aplicación para cada uno.
          </p>
        </div>
        <Badge variant="secondary" className="h-7 gap-1.5 px-3 text-sm">
          <ShieldCheck aria-hidden className="size-4" />
          {roles.length} roles del sistema
        </Badge>
      </header>

      <Aviso>
        Esta vista es de consulta. Para asignar o cambiar el rol de una persona, abre su ficha en Usuarios del sistema.
      </Aviso>

      {roles.length === 0 ? (
        <Aviso>No hay roles disponibles para consultar.</Aviso>
      ) : (
        <div className="grid min-w-0 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <section aria-labelledby="roles-sistema" className="self-start rounded-3xl border border-border bg-card p-5 sm:p-6">
            <h2 id="roles-sistema" className="mb-4 text-lg font-semibold text-heading">Roles del sistema</h2>
            <ul className="flex flex-col gap-1.5">
              {roles.map((rol) => (
                <li key={rol}>
                  <button
                    type="button"
                    aria-pressed={seleccionado === rol}
                    onClick={() => setSeleccionado(rol)}
                    className={cn(
                      'flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      seleccionado === rol ? 'bg-primary/10 font-semibold text-heading' : 'text-muted-foreground hover:bg-muted/60 hover:text-heading',
                    )}
                  >
                    {formatRol(rol)}
                    {seleccionado === rol && <ArrowRight aria-hidden className="size-4 shrink-0 text-link" />}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="detalle-rol" className="min-w-0 rounded-3xl border border-border bg-card p-6 not-dark:shadow-xl not-dark:shadow-brand-ink/5 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 id="detalle-rol" className="text-2xl font-bold text-heading">{formatRol(seleccionado)}</h2>
                <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
                  {cantidad} {cantidad === 1 ? 'opción visible' : 'opciones visibles'} en el menú.
                </p>
              </div>
              <Button asChild variant="outline" className="min-h-11 rounded-xl">
                <Link to={`/usuarios?${new URLSearchParams({ rol: seleccionado })}`}>
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
          </section>
        </div>
      )}
    </div>
  )
}
