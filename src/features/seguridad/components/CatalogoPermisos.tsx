import { useState, type FormEvent } from 'react'
import { KeyRound, Pencil, Plus, Trash2 } from 'lucide-react'

import { edicionPermisoSchema, nuevoPermisoSchema, type PermisoWorkOS } from '@/features/seguridad/api/seguridad.contract'
import { useBorrarPermiso, useCrearPermiso, useEditarPermiso, usePermisosWorkOS } from '@/features/seguridad/hooks/useSeguridad'
import { Aviso, Button, Cargando, Input, Label } from '@/shared/ui'

/**
 * Catálogo: crear, editar (nombre y descripción) y borrar permisos generales de WorkOS.
 * Solo org-admin (la página ya lo verifica y el backend también). Asignarlos a roles va en «Asignación».
 */
export function CatalogoPermisos() {
  const permisos = usePermisosWorkOS(true)
  const crear = useCrearPermiso()
  const [form, setForm] = useState({ slug: '', nombre: '', descripcion: '' })
  const [errorForm, setErrorForm] = useState<string | null>(null)

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
    <div>
      <h2 className="flex items-center gap-2 text-2xl font-bold text-heading">
        <KeyRound aria-hidden className="size-6 text-link" />
        Catálogo de permisos
      </h2>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Permisos generales de WorkOS, por área y acción (p. ej. <code>prd-aprobar</code>). Un permiso nuevo no habilita nada hasta que la aplicación lo use; asígnalo a los roles en «Asignación».
      </p>

      <form onSubmit={enviar} className="mt-5 grid gap-4 rounded-2xl border border-border p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] lg:items-end" noValidate>
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
      ) : catalogo.length === 0 ? (
        <div className="mt-5"><Aviso>Todavía no hay permisos propios.</Aviso></div>
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-2xl border border-border">
          {catalogo.map((p) => <FilaPermiso key={p.slug} permiso={p} />)}
        </ul>
      )}
    </div>
  )
}

function FilaPermiso({ permiso }: { permiso: PermisoWorkOS }) {
  const editar = useEditarPermiso()
  const borrar = useBorrarPermiso()
  const [modo, setModo] = useState<'ver' | 'editar' | 'borrar'>('ver')
  const [datos, setDatos] = useState({ nombre: permiso.nombre, descripcion: permiso.descripcion ?? '' })
  const [error, setError] = useState<string | null>(null)

  function guardar() {
    const cambios = edicionPermisoSchema.safeParse(datos)
    if (!cambios.success) {
      setError(cambios.error.issues[0]?.message ?? 'Revisa los datos.')
      return
    }
    setError(null)
    editar.mutate({ slug: permiso.slug, cambios: cambios.data }, { onSuccess: () => setModo('ver') })
  }

  const fallo = error ?? editar.error?.message ?? borrar.error?.message

  return (
    <li className="flex flex-col gap-3 px-4 py-3">
      {modo === 'editar' ? (
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-end">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`editar-nombre-${permiso.slug}`}>Nombre de <code>{permiso.slug}</code></Label>
            <Input id={`editar-nombre-${permiso.slug}`} value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`editar-descripcion-${permiso.slug}`}>Descripción</Label>
            <Input id={`editar-descripcion-${permiso.slug}`} value={datos.descripcion} onChange={(e) => setDatos({ ...datos, descripcion: e.target.value })} />
          </div>
          <span className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => { setModo('ver'); setError(null) }}>Cancelar</Button>
            <Button type="button" size="sm" disabled={editar.isPending} onClick={guardar}>{editar.isPending ? 'Guardando…' : 'Guardar'}</Button>
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-heading">{permiso.nombre}</p>
            <p className="text-xs text-muted-foreground"><code>{permiso.slug}</code>{permiso.descripcion ? ` · ${permiso.descripcion}` : ''}</p>
          </div>
          {modo === 'borrar' ? (
            <span className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Se quitará de todos los roles.</span>
              <Button type="button" variant="outline" size="sm" onClick={() => setModo('ver')}>Cancelar</Button>
              <Button type="button" variant="destructive" size="sm" disabled={borrar.isPending} onClick={() => borrar.mutate(permiso.slug)}>
                Confirmar
              </Button>
            </span>
          ) : (
            <span className="flex gap-1">
              <Button type="button" variant="ghost" size="sm" aria-label={`Editar ${permiso.slug}`} onClick={() => setModo('editar')}>
                <Pencil aria-hidden />
                Editar
              </Button>
              <Button type="button" variant="ghost" size="sm" aria-label={`Borrar ${permiso.slug}`} onClick={() => setModo('borrar')}>
                <Trash2 aria-hidden />
                Borrar
              </Button>
            </span>
          )}
        </div>
      )}
      {fallo && <Aviso tono="error">{fallo}</Aviso>}
    </li>
  )
}
