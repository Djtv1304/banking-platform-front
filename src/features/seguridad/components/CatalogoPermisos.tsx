import { useState, type FormEvent } from 'react'
import { KeyRound, Plus, Trash2 } from 'lucide-react'

import { nuevoPermisoSchema } from '@/features/seguridad/api/seguridad.contract'
import { useBorrarPermiso, useCrearPermiso, usePermisosWorkOS } from '@/features/seguridad/hooks/useSeguridad'
import { Aviso, Button, Cargando, Input, Label } from '@/shared/ui'

/**
 * SEG09/10 · Permisos generales de WorkOS: crear y borrar (solo org-admin; la página ya lo verifica).
 * La asignación a cada rol se hace en el panel del rol.
 */
export function CatalogoPermisos() {
  const permisos = usePermisosWorkOS(true)
  const crear = useCrearPermiso()
  const borrar = useBorrarPermiso()
  const [form, setForm] = useState({ slug: '', nombre: '', descripcion: '' })
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [porBorrar, setPorBorrar] = useState<string | null>(null)

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    const datos = nuevoPermisoSchema.safeParse(form)
    if (!datos.success) {
      setErrorForm(datos.error.issues[0]?.message ?? 'Revisa los datos del permiso.')
      return
    }
    setErrorForm(null)
    crear.mutate(datos.data, { onSuccess: () => setForm({ slug: '', nombre: '', descripcion: '' }) })
  }

  const catalogo = (permisos.data ?? []).filter((p) => !p.sistema)

  return (
    <section aria-labelledby="catalogo-permisos" className="rounded-3xl border border-border bg-card p-6 sm:p-8">
      <h2 id="catalogo-permisos" className="flex items-center gap-2 text-2xl font-bold text-heading">
        <KeyRound aria-hidden className="size-6 text-link" />
        Permisos
      </h2>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Permisos generales de WorkOS, por área y acción (p. ej. <code>prd-aprobar</code>). Un permiso nuevo no habilita nada hasta que la aplicación lo use; después asígnalo a los roles en el panel de cada rol.
      </p>

      <form onSubmit={enviar} className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-end" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="permiso-slug">Código</Label>
          <Input id="permiso-slug" value={form.slug} placeholder="prd-aprobar" autoComplete="off" onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="permiso-nombre">Nombre</Label>
          <Input id="permiso-nombre" value={form.nombre} placeholder="Aprobar productos" onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="permiso-descripcion">Descripción (opcional)</Label>
          <Input id="permiso-descripcion" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
        </div>
        <Button type="submit" className="min-h-11 rounded-xl" disabled={crear.isPending}>
          <Plus aria-hidden />
          {crear.isPending ? 'Creando…' : 'Crear permiso'}
        </Button>
      </form>
      {(errorForm ?? crear.error?.message) && (
        <div className="mt-4"><Aviso tono="error">{errorForm ?? crear.error?.message}</Aviso></div>
      )}

      {permisos.error ? (
        <div className="mt-5"><Aviso tono="error">{permisos.error.message}</Aviso></div>
      ) : permisos.isPending ? (
        <Cargando texto="Cargando permisos…" />
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-2xl border border-border">
          {catalogo.map((p) => (
            <li key={p.slug} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-heading">{p.nombre}</p>
                <p className="text-xs text-muted-foreground"><code>{p.slug}</code>{p.descripcion ? ` · ${p.descripcion}` : ''}</p>
              </div>
              {porBorrar === p.slug ? (
                <span className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Se quitará de todos los roles.</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => setPorBorrar(null)}>Cancelar</Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={borrar.isPending}
                    onClick={() => borrar.mutate(p.slug, { onSuccess: () => setPorBorrar(null) })}
                  >
                    Confirmar
                  </Button>
                </span>
              ) : (
                <Button type="button" variant="ghost" size="sm" aria-label={`Borrar ${p.slug}`} onClick={() => setPorBorrar(p.slug)}>
                  <Trash2 aria-hidden />
                  Borrar
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {borrar.error && <div className="mt-4"><Aviso tono="error">{borrar.error.message}</Aviso></div>}
    </section>
  )
}
