import { useState } from 'react'
import { ListChecks } from 'lucide-react'

import { formatRol } from '@/features/auth'
import { slugRol } from '@/features/seguridad/api/seguridad.contract'
import { PermisosRolPanel } from '@/features/seguridad/components/PermisosRolPanel'
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui'

/** Asignación: el administrador elige un rol y marca los permisos que tendrá. */
export function AsignacionPermisos({ roles }: { roles: readonly string[] }) {
  const [rol, setRol] = useState(roles[0] ?? '')

  return (
    <div>
      <h2 className="flex items-center gap-2 text-2xl font-bold text-heading">
        <ListChecks aria-hidden className="size-6 text-link" />
        Asignación de permisos
      </h2>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Elige un rol y marca los permisos que tendrá. Cada cambio se guarda al instante y aplica cuando el usuario vuelve a iniciar sesión o se renueva su sesión.
      </p>

      <div className="mt-5 flex max-w-sm flex-col gap-1.5">
        <Label htmlFor="asignacion-rol">Rol</Label>
        <Select value={rol} onValueChange={setRol}>
          <SelectTrigger id="asignacion-rol" className="min-h-11 rounded-xl">
            <SelectValue placeholder="Selecciona un rol" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((r) => (
              <SelectItem key={r} value={r}>
                {formatRol(r)} ({slugRol(r)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rol && <PermisosRolPanel rol={rol} />}
    </div>
  )
}
