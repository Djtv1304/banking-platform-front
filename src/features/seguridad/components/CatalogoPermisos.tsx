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
  const [creando, setCreando] = useState(false)
  const [form, setForm] = useState({ slug: '', nombre: '', descripcion: '' })
  const [errorForm, setErrorForm] = useState<string | null>(null)

  function cerrar() {
    setCreando(false)
    setErrorForm(null)
    setForm({ slug: '', nombre: '', descripcion: '' })
    crear.reset()
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    const datos = nuevoPermisoSchema.safeParse(form)
    if (!datos.success) {
      setErrorForm(datos.error.issues[0]?.message ?? 'Revisa los datos del permiso.')
      return
    }
    setErrorForm(null)
    crear.mutate(datos.data, { onSuccess: cerrar })
  }

  const catalogo = (permisos.data ?? []).filter((p) => !p.sistema)

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-heading">
            <KeyRound aria-hidden className="size-6 text-link" />
            Catálogo de permisos
          </h2>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            {catalogo.length} {catalogo.length === 1 ? 'permiso vigente' : 'permisos vigentes'} en la plataforma.
          </p>
        </div>
        {!creando && (
          <Button type="button" className="min-h-11 rounded-xl" onClick={() => setCreando(true)}>
            <Plus aria-hidden />
            Nuevo permiso
          </Button>
        )}
      </div>

      {creando && (
        <form onSubmit={enviar} className="mt-5 flex flex-col gap-4 rounded-2xl border border-border p-4" noValidate aria-label="Nuevo permiso">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="permiso-slug">Código</Label>
              <Input id="permiso-slug" value={form.slug} placeholder="prd-aprobar" autoComplete="off" onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} />
              <span className="text-xs text-muted-foreground">Área y acción en minúsculas. No se puede cambiar después.</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="permiso-nombre">Nombre</Label>
              <Input id="permiso-nombre" value={form.nombre} placeholder="Aprobar productos" onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="permiso-descripcion">Descripción</Label>
            <Input id="permiso-descripcion" value={form.descripcion} placeholder="Qué permite hacer" onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </div>
          {(errorForm ?? crear.error?.message) && <Aviso tono="error">{errorForm ?? crear.error?.message}</Aviso>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="min-h-11 rounded-xl" onClick={cerrar}>Cancelar</Button>
            <Button type="submit" className="min-h-11 rounded-xl" disabled={crear.isPending}>{crear.isPending ? 'Creando…' : 'Crear permiso'}</Button>
          </div>
        </form>
      )}

      {permisos.error ? (
        <div className="mt-5"><Aviso tono="error">{permisos.error.message}</Aviso></div>
      ) : permisos.isPending ? (
        <Cargando texto="Cargando permisos…" />
      ) : catalogo.length === 0 ? (
        <div className="mt-5"><Aviso>Todavía no hay permisos en la plataforma.</Aviso></div>
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-2xl border border-border">
          {catalogo.map((p) => <FilaPermiso key={p.slug} permiso={p} />)}
        </ul>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        Un permiso nuevo no habilita nada hasta que la aplicación lo use. Para dárselo a un rol usa «Asignación».
      </p>
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
            <p className="text-sm font-medium text-heading">{permiso.nombre} <code className="ml-1 text-xs font-normal text-muted-foreground">{permiso.slug}</code></p>
            <p className="text-sm text-muted-foreground">{permiso.descripcion || 'Sin descripción'}</p>
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
