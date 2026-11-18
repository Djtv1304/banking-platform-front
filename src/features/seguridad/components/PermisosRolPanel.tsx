import { KeyRound } from 'lucide-react'

import { useCambiarPermisoRol, usePermisosWorkOS, useRolesPermisos } from '@/features/seguridad/hooks/useSeguridad'
import { Aviso, Cargando, Checkbox, Label } from '@/shared/ui'

/** SEG01/03/04/05 · Permisos de WorkOS del rol: asignar y quitar. Solo lo usa un ADMIN. */
export function PermisosRolPanel({ rol }: { rol: string }) {
  const permisos = usePermisosWorkOS(Boolean(rol))
  const roles = useRolesPermisos(Boolean(rol))
  const cambio = useCambiarPermisoRol()

  const asignados = new Set(roles.data?.find((r) => r.rol === rol)?.permisos ?? [])
  const catalogo = (permisos.data ?? []).filter((p) => !p.sistema)
  const error = permisos.error ?? roles.error

  return (
    <section aria-labelledby="permisos-rol" className="mt-8 border-t border-border pt-6">
      <h3 id="permisos-rol" className="flex items-center gap-2 text-lg font-semibold text-heading">
        <KeyRound aria-hidden className="size-5 text-link" />
        Permisos de WorkOS
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Los permisos son generales (productos, contabilidad). Un cambio aplica cuando el usuario vuelve a iniciar sesión o se renueva su sesión.
      </p>

      {error ? (
        <div className="mt-4"><Aviso tono="error">{error.message}</Aviso></div>
      ) : permisos.isPending || roles.isPending ? (
        <Cargando texto="Cargando permisos…" />
      ) : catalogo.length === 0 ? (
        <div className="mt-4"><Aviso>No hay permisos configurados en WorkOS.</Aviso></div>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {catalogo.map((p) => {
            const id = `permiso-${rol}-${p.slug}`
            const pendiente = cambio.isPending && cambio.variables?.permiso === p.slug
            return (
              <li key={p.slug} className="flex items-start gap-3 rounded-xl border border-border p-3">
                <Checkbox
                  id={id}
                  checked={asignados.has(p.slug)}
                  disabled={cambio.isPending}
                  aria-busy={pendiente}
                  onCheckedChange={(valor) => cambio.mutate({ rol, permiso: p.slug, asignar: valor === true })}
                  className="mt-0.5"
                />
                <Label htmlFor={id} className="flex flex-col items-start gap-0.5 font-normal">
                  <span className="text-sm font-medium text-heading">{p.nombre}</span>
                  <code className="text-xs text-muted-foreground">{p.slug}</code>
                  {p.descripcion && <span className="text-xs text-muted-foreground">{p.descripcion}</span>}
                </Label>
              </li>
            )
          })}
        </ul>
      )}
      {cambio.error && <div className="mt-4"><Aviso tono="error">{cambio.error.message}</Aviso></div>}
    </section>
  )
}
