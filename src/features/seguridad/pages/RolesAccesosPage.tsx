import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRight, ShieldCheck, Users } from 'lucide-react'

import { formatRol, hasAnyRole, useAuthStore, type MeResponse } from '@/features/auth'
import { ROLES_CONSULTA_ROLES, type SeccionAccesoRol } from '@/features/seguridad/lib/acceso'
import { Aviso, Badge, Button } from '@/shared/ui'
import { cn } from '@/shared/lib'
import { useConfiguracionFunciones } from '@/features/seguridad/hooks/useConfiguracionFunciones'
import { valorSeleccionado } from '@/features/seguridad/lib/borrador-funciones'
import { useConfiguracionAccesos } from '@/features/seguridad/hooks/useConfiguracionAccesos'

interface RolesAccesosPageProps {
  roles: readonly string[]
  seccionesParaRol: (rol: string, pestanas?: Readonly<Record<string, readonly string[]>>, autorizacion?: MeResponse['autorizacion']) => SeccionAccesoRol[]
}

type Vista = { tipo: 'rol'; rol: string }

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
  const porFunciones = useAuthStore((state) => state.user?.autorizacion?.activa === true)
  const admin = hasAnyRole(actuales ?? [], ROLES_CONSULTA_ROLES)
  const configuracion = useConfiguracionAccesos(admin && !porFunciones)
  const funciones = useConfiguracionFunciones(admin && porFunciones)
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
            Consulta los roles y sus usuarios. Configura sus operaciones desde el editor de accesos por función.
          </p>
        </div>
        <Badge variant="secondary" className="h-7 gap-1.5 px-3 text-sm">
          <ShieldCheck aria-hidden className="size-4" />
          {roles.length} roles del sistema
        </Badge>
      </header>

      {porFunciones && (
        <Aviso>
          Las funciones migradas se autorizan con la configuración de «Accesos por función».
          Los permisos de WorkOS se conservan para las operaciones que aún usan las reglas anteriores.
        </Aviso>
      )}
      <Aviso>
        Para configurar consultas y operaciones de cada rol usa «Accesos por función».
        Para cambiar el rol de una persona, abre su ficha en Usuarios del sistema.
      </Aviso>

      <section aria-label="Configurar accesos" className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <div><h2 className="font-semibold text-heading">Editor principal de accesos</h2><p className="mt-1 text-sm text-muted-foreground">Concede o retira consultas y operaciones por rol. Revisa los cambios y el motivo antes de guardarlos.</p></div>
        <Button asChild className="min-h-11 rounded-xl"><Link to="/seguridad/pestanas">Editar accesos por función<ArrowRight aria-hidden /></Link></Button>
      </section>
      <p className="text-sm text-muted-foreground">Los permisos que aún utiliza WorkOS se administran por separado en <Link to="/seguridad/workos" className="font-semibold text-link underline underline-offset-4">WorkOS avanzado</Link>.</p>

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


          </div>

          <section aria-label="Detalle" className="min-w-0 rounded-3xl border border-border bg-card p-6 not-dark:shadow-xl not-dark:shadow-brand-ink/5 sm:p-8">
            {
              porFunciones ? (
                funciones.data ? <DetalleRol rol={vista.rol} secciones={seccionesParaRol(vista.rol, undefined, {
                  activa: true, version: funciones.data.version,
                  funciones: funciones.data.funciones.filter((f) => valorSeleccionado(funciones.data!, {}, f, vista.rol)).map((f) => f.id),
                  rutas: [],
                })} /> : <Aviso>{funciones.isPending ? 'Consultando funciones...' : 'No pudimos consultar las funciones.'}<Button variant="outline" onClick={() => void funciones.refetch()}>Reintentar consulta</Button></Aviso>
              ) : configuracion.data ? <DetalleRol rol={vista.rol} secciones={seccionesParaRol(vista.rol, Object.fromEntries(configuracion.data.pestanas.map((p) => [p.pestana, p.roles])))} />
                : <Aviso>{configuracion.isPending ? 'Consultando los accesos configurados…' : 'No pudimos consultar los accesos configurados.'}<Button variant="outline" onClick={() => void configuracion.refetch()}>Reintentar consulta</Button></Aviso>
            }
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
