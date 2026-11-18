import { useMemo, useState } from 'react'
import { LayoutList, RotateCcw, Save } from 'lucide-react'

import { formatRol, hasAnyRole, useAuthStore } from '@/features/auth'
import { useGuardarPestanas, usePestanas } from '@/features/seguridad/hooks/useSeguridad'
import { ROLES_CONSULTA_ROLES } from '@/features/seguridad/lib/acceso'
import type { PestanaRoles } from '@/features/seguridad/api/seguridad.contract'
import { Aviso, Badge, Button, Cargando, Checkbox } from '@/shared/ui'

export interface PestanaEditable {
  to: string
  label: string
  seccion: string
  rolesPorDefecto: readonly string[]
  requiereAccion: boolean
}

interface PestanasRolPageProps {
  pestanas: readonly PestanaEditable[]
  roles: readonly string[]
}

type Seleccion = Record<string, readonly string[]>

const igual = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((r) => b.includes(r))

/** SEG07/08 · Qué roles ven cada pestaña del menú. Solo cambia el menú: cada API valida su acceso. */
export function PestanasRolPage({ pestanas, roles }: PestanasRolPageProps) {
  const actuales = useAuthStore((state) => state.user?.roles)
  const esAdmin = hasAnyRole(actuales ?? [], ROLES_CONSULTA_ROLES)
  const guardadas = usePestanas(esAdmin)
  const guardar = useGuardarPestanas()
  const [edicion, setEdicion] = useState<Seleccion | null>(null)

  const base = useMemo<Seleccion>(() => {
    const configuradas = new Map((guardadas.data ?? []).map((p) => [p.pestana, p.roles]))
    return Object.fromEntries(pestanas.map((p) => [p.to, configuradas.get(p.to) ?? p.rolesPorDefecto]))
  }, [guardadas.data, pestanas])

  if (!esAdmin) return <Aviso tono="error">Solo un administrador puede configurar las pestañas por rol.</Aviso>

  const seleccion = edicion ?? base
  const cambiado = pestanas.some((p) => !igual(seleccion[p.to] ?? [], base[p.to] ?? []))

  function alternar(to: string, rol: string, ver: boolean) {
    const actual = seleccion[to] ?? []
    setEdicion({ ...seleccion, [to]: ver ? [...actual, rol] : actual.filter((r) => r !== rol) })
  }

  /** Grupo de módulos (sección del menú): marca o desmarca todas sus pestañas para ese rol */
  function alternarGrupo(seccion: string, rol: string, ver: boolean) {
    const nueva = { ...seleccion }
    for (const p of pestanas.filter((x) => x.seccion === seccion)) {
      const actual = nueva[p.to] ?? []
      nueva[p.to] = ver ? [...new Set([...actual, rol])] : actual.filter((r) => r !== rol)
    }
    setEdicion(nueva)
  }

  function estadoGrupo(seccion: string, rol: string): boolean | 'indeterminate' {
    const delGrupo = pestanas.filter((p) => p.seccion === seccion)
    const marcadas = delGrupo.filter((p) => (seleccion[p.to] ?? []).includes(rol)).length
    if (marcadas === 0) return false
    return marcadas === delGrupo.length ? true : 'indeterminate'
  }

  function enviar(nueva: Seleccion) {
    // Solo se guardan las que difieren del menú por defecto
    const cuerpo: PestanaRoles[] = pestanas
      .filter((p) => !igual(nueva[p.to] ?? [], p.rolesPorDefecto))
      .map((p) => ({ pestana: p.to, roles: roles.filter((r) => (nueva[p.to] ?? []).includes(r)) }))
    guardar.mutate(cuerpo, { onSuccess: () => setEdicion(null) })
  }

  const secciones = [...new Set(pestanas.map((p) => p.seccion))]

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] leading-tight font-bold tracking-tight text-heading sm:text-[40px]">Pestañas por rol</h1>
          <p className="mt-2 max-w-2xl text-base text-muted-foreground">
            Elige qué grupos de módulos y qué pestañas ve cada rol. La casilla del grupo marca o desmarca todas sus pestañas; un grupo sin pestañas visibles desaparece del menú.
          </p>
        </div>
        <Badge variant="secondary" className="h-7 gap-1.5 px-3 text-sm">
          <LayoutList aria-hidden className="size-4" />
          {pestanas.length} pestañas
        </Badge>
      </header>

      <Aviso>
        Solo cambia lo que muestra el menú. Cada pantalla sigue validando el rol o permiso en el servidor: si muestras una pestaña a un rol que no tiene acceso, esa pantalla le responderá «sin permiso». Las pestañas marcadas con «Requiere acción» además exigen el permiso o rol de esa operación.
      </Aviso>

      {guardadas.error && (
        <Aviso tono="error">No pudimos leer la configuración guardada; se muestra el menú por defecto. {guardadas.error.message}</Aviso>
      )}
      {guardadas.isPending ? (
        <Cargando texto="Cargando configuración…" />
      ) : (
        <section aria-labelledby="matriz-pestanas" className="min-w-0 rounded-3xl border border-border bg-card p-4 sm:p-6">
          <h2 id="matriz-pestanas" className="sr-only">Pestañas y roles</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th scope="col" className="py-2 pr-4 font-medium">Pestaña</th>
                  {roles.map((rol) => (
                    <th key={rol} scope="col" className="px-2 py-2 text-center font-medium">
                      {formatRol(rol)}
                    </th>
                  ))}
                </tr>
              </thead>
              {secciones.map((seccion) => (
                <tbody key={seccion}>
                  <tr className="bg-muted/40">
                    <th scope="rowgroup" className="py-2.5 pr-4 pl-2 text-left text-xs font-semibold tracking-wide text-heading uppercase">
                      {seccion}
                    </th>
                    {roles.map((rol) => (
                      <td key={rol} className="px-2 py-2.5 text-center">
                        <Checkbox
                          aria-label={`Grupo ${seccion}: ${formatRol(rol)}`}
                          checked={estadoGrupo(seccion, rol)}
                          disabled={guardar.isPending}
                          onCheckedChange={(valor) => alternarGrupo(seccion, rol, valor === true)}
                          className="mx-auto"
                        />
                      </td>
                    ))}
                  </tr>
                  {pestanas.filter((p) => p.seccion === seccion).map((p) => (
                    <tr key={p.to} className="border-b border-border/60">
                      <th scope="row" className="py-2.5 pr-4 text-left font-normal text-heading">
                        <span className="flex flex-wrap items-center gap-2">
                          {p.label}
                          {p.requiereAccion && <Badge variant="secondary">Requiere acción</Badge>}
                          {!igual(seleccion[p.to] ?? [], p.rolesPorDefecto) && <Badge variant="outline">Personalizada</Badge>}
                        </span>
                      </th>
                      {roles.map((rol) => (
                        <td key={rol} className="px-2 py-2.5 text-center">
                          <Checkbox
                            aria-label={`${p.label}: ${formatRol(rol)}`}
                            checked={(seleccion[p.to] ?? []).includes(rol)}
                            disabled={guardar.isPending}
                            onCheckedChange={(valor) => alternar(p.to, rol, valor === true)}
                            className="mx-auto"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>

          {guardar.error && <div className="mt-4"><Aviso tono="error">{guardar.error.message}</Aviso></div>}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 rounded-xl"
              disabled={guardar.isPending}
              onClick={() => enviar(Object.fromEntries(pestanas.map((p) => [p.to, p.rolesPorDefecto])))}
            >
              <RotateCcw aria-hidden />
              Restablecer menú por defecto
            </Button>
            <Button type="button" className="min-h-11 rounded-xl" disabled={!cambiado || guardar.isPending} onClick={() => enviar(seleccion)}>
              <Save aria-hidden />
              {guardar.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
