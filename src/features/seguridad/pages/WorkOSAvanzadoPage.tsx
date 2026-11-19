import { Link, useSearchParams } from 'react-router'
import { ArrowLeft, KeyRound, ListChecks } from 'lucide-react'

import { hasAnyRole, useAuthStore } from '@/features/auth'
import { CatalogoPermisos } from '@/features/seguridad/components/CatalogoPermisos'
import { AsignacionPermisos } from '@/features/seguridad/components/AsignacionPermisos'
import { ROLES_CONSULTA_ROLES } from '@/features/seguridad/lib/acceso'
import { Aviso, Badge, Button } from '@/shared/ui'

/** Herramientas existentes de WorkOS; no sustituyen al editor de funciones SQL. */
export function WorkOSAvanzadoPage({ roles }: { roles: readonly string[] }) {
  const actuales = useAuthStore((state) => state.user?.roles)
  const porFunciones = useAuthStore((state) => state.user?.autorizacion?.activa === true)
  const [parametros, setParametros] = useSearchParams()
  const vista = parametros.get('vista') === 'asignacion' ? 'asignacion' : 'catalogo'

  if (!hasAnyRole(actuales ?? [], ROLES_CONSULTA_ROLES)) {
    return <Aviso tono="error">Solo un administrador puede administrar los permisos de WorkOS.</Aviso>
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <Button asChild variant="ghost" className="w-fit rounded-xl">
        <Link to="/seguridad/pestanas"><ArrowLeft aria-hidden />Volver al editor principal</Link>
      </Button>
      <header>
        <Badge variant="outline" className="mb-3">Administración avanzada</Badge>
        <h1 className="text-3xl font-bold tracking-tight text-heading sm:text-4xl">Permisos de WorkOS</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Administra los permisos de WorkOS que utilizan las APIs de Enquo.
          Los cambios de estas herramientas se envían a WorkOS; no se guardan como funciones del editor principal.
        </p>
      </header>
      <Aviso>
        {porFunciones
          ? 'El control por funciones está activo: las operaciones migradas se configuran en «Accesos por función». WorkOS conserva permisos de procesos como aprobaciones, plantillas y reclasificaciones contables.'
          : 'El control por funciones está desactivado: siguen las reglas actuales de rol y permisos de WorkOS. Guardar en el editor principal todavía no sustituye esas reglas.'}
        {' '}Estas herramientas no activan la personalización por funciones.
      </Aviso>
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-semibold text-heading"><KeyRound className="size-4" />Catálogo: qué permisos existen</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Crear un permiso añade una definición en WorkOS. No crea una pantalla ni una operación:
            el backend debe estar preparado para comprobar ese permiso.
          </p>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-semibold text-heading"><ListChecks className="size-4" />Asignación: qué roles los reciben</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Vincula permisos existentes a un rol en WorkOS. Su efecto depende de las operaciones
            que aún los verifican y de la actualización de la sesión del usuario.
          </p>
        </section>
      </div>
      <section className="min-w-0 rounded-3xl border border-border bg-card p-5 sm:p-8">
        <nav aria-label="Herramientas de WorkOS" className="mb-6 grid gap-3 sm:grid-cols-2">
          <Button className="min-h-11 w-full rounded-xl" variant={vista === 'catalogo' ? 'default' : 'outline'}
            aria-pressed={vista === 'catalogo'} onClick={() => setParametros({ vista: 'catalogo' })}>
            <KeyRound aria-hidden />Catálogo de permisos
          </Button>
          <Button className="min-h-11 w-full rounded-xl" variant={vista === 'asignacion' ? 'default' : 'outline'}
            aria-pressed={vista === 'asignacion'} onClick={() => setParametros({ vista: 'asignacion' })}>
            <ListChecks aria-hidden />Asignación a roles
          </Button>
        </nav>
        {vista === 'catalogo' ? <CatalogoPermisos /> : <AsignacionPermisos roles={roles} />}
      </section>
    </div>
  )
}
