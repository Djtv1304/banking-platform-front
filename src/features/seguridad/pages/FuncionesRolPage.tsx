import { useState } from 'react'
import { ArrowDown, ArrowUp, Check, LockKeyhole, RefreshCw, RotateCcw, Save, Search, ShieldCheck, Users } from 'lucide-react'
import { formatRol, useAuthStore } from '@/features/auth'
import { Aviso, Badge, Button, Cargando, Checkbox, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input } from '@/shared/ui'
import { useEditorFunciones } from '@/features/seguridad/hooks/useEditorFunciones'
import { ajuste, claveFuncion, valorInicial, valorSeleccionado } from '@/features/seguridad/lib/borrador-funciones'

type Confirmacion = 'guardar' | 'restablecer' | 'descartar' | null

export function FuncionesRolPage() {
  const esAdmin = useAuthStore((s) => s.user?.roles.includes('ADMIN') ?? false)
  const editor = useEditorFunciones(esAdmin)
  const [rol, setRol] = useState('ASESOR')
  const [busqueda, setBusqueda] = useState('')
  const [soloCambios, setSoloCambios] = useState(false)
  const [confirmacion, setConfirmacion] = useState<Confirmacion>(null)
  const config = editor.base
  if (!esAdmin) return <Aviso tono="error">Solo un administrador puede configurar los accesos por función.</Aviso>
  if (!config) return editor.consulta.isError
    ? <Aviso tono="error">No pudimos cargar las funciones. <Button variant="outline" onClick={() => void editor.actualizar()}>Reintentar</Button></Aviso>
    : <Cargando texto="Cargando funciones y roles…" />

  const seleccionado = config.roles.includes(rol) ? rol : config.roles[0]
  const funciones = config.funciones.filter((f) => {
    const texto = `${f.nombre} ${f.modulo}`.toLocaleLowerCase('es')
    return texto.includes(busqueda.trim().toLocaleLowerCase('es'))
      && (!soloCambios || Object.hasOwn(editor.borrador, claveFuncion(f.id, seleccionado)))
  })
  const modulos = [...new Set(funciones.map((f) => f.modulo))]
  const valorTexto = (valor: boolean | null) => valor === null ? 'Valor inicial' : valor ? 'Permitido' : 'Sin acceso'

  async function confirmar() {
    if (confirmacion === 'guardar') await editor.guardar()
    else if (confirmacion === 'restablecer') editor.restablecerRol(seleccionado)
    else if (confirmacion === 'descartar') editor.descartar()
    setConfirmacion(null)
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary"><ShieldCheck className="size-4" /> Administración de seguridad</div>
          <h1 className="text-3xl font-bold tracking-tight text-heading sm:text-4xl">Accesos por función</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">Elige un rol y configura lo que puede consultar o hacer. Revisa los cambios antes de guardarlos.</p>
        </div>
        <Badge variant="outline" className="gap-2 px-3 py-2">
          <span className={`size-2 rounded-full ${config.activa ? 'bg-emerald-600' : 'bg-amber-500'}`} />
          Personalización {config.activa ? 'activa' : 'desactivada'}
        </Badge>
      </header>
      {!config.activa && <Aviso>Se mantienen las reglas de acceso anteriores. Puedes preparar cambios, pero guardarlos no activa esta personalización.</Aviso>}
      {editor.mensaje && <div role="status"><Aviso>{editor.mensaje}</Aviso></div>}
      {(editor.error || editor.consulta.isError) && <Aviso tono="error">{editor.error || 'No pudimos actualizar la configuración. Conservamos tu borrador.'}</Aviso>}
      {editor.incierto && <Aviso>Antes de volver a guardar, verifica qué quedó registrado. Conservaremos tu selección y motivo. <Button variant="outline" className="ml-2 h-11 rounded-xl" onClick={() => void editor.actualizar()} disabled={editor.ocupado}>Verificar guardado</Button></Aviso>}

      {editor.conflictos.length > 0 && (
        <section className="rounded-2xl border border-amber-500/50 bg-amber-500/5 p-5" aria-labelledby="conflictos-funciones">
          <h2 id="conflictos-funciones" className="font-semibold text-heading">Hay cambios que necesitan tu revisión</h2>
          <p className="mt-1 text-sm text-muted-foreground">Tu motivo y borrador siguen aquí. No se sobrescribió la configuración de otra persona.</p>
          <div className="mt-4 space-y-3">{editor.conflictos.map((c) => (
            <div key={c.clave} className="rounded-xl border border-border bg-card p-4">
              <p className="font-semibold text-heading">{c.nombre} · {formatRol(c.rol)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{c.motivo} Antes: {valorTexto(c.anterior)}. Guardado: {valorTexto(c.guardado)}. Tu propuesta: {valorTexto(c.propuesto)}.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" className="h-11 min-w-44 rounded-xl" onClick={() => editor.resolver(c, false)}>Usar lo guardado</Button>
                {!c.bloqueado && <Button className="h-11 min-w-44 rounded-xl" onClick={() => editor.resolver(c, true)}>Conservar mi cambio</Button>}
              </div>
            </div>
          ))}</div>
        </section>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-border bg-card p-3 lg:sticky lg:top-4" aria-label="Roles disponibles">
          <p className="mb-3 px-3 pt-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Selecciona un rol</p>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-1">{config.roles.map((r) => {
            const cantidad = config.funciones.filter((f) => valorSeleccionado(config, editor.borrador, f, r)).length
            const pendientes = editor.cambios.filter((c) => c.rol === r).length
            return <button key={r} type="button" aria-pressed={r === seleccionado} onClick={() => setRol(r)}
              className={`flex min-h-16 min-w-0 items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring ${r === seleccionado ? 'bg-primary/15 text-heading ring-1 ring-primary/50' : 'text-muted-foreground hover:bg-muted'}`}>
              <Users className={`size-4 shrink-0 ${r === seleccionado ? 'text-primary' : ''}`} />
              <span className="min-w-0"><span className="block break-words text-sm font-semibold">{formatRol(r)}</span><span className="block text-xs text-muted-foreground">{cantidad} funciones{pendientes ? ` · ${pendientes} cambios` : ''}</span></span>
            </button>
          })}</div>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card" aria-labelledby="rol-en-edicion">
          <div className="border-b border-border bg-primary/5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Estás configurando</p><h2 id="rol-en-edicion" className="mt-1 text-2xl font-bold text-heading">{formatRol(seleccionado)}</h2></div>
              <Button variant="outline" className="min-h-11 max-w-full whitespace-normal rounded-xl" disabled={editor.ocupado || !!editor.conflictos.length || editor.incierto} onClick={() => setConfirmacion('restablecer')}><RotateCcw /> Valores iniciales del rol</Button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="relative min-w-0 basis-48 flex-1"><Search className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" /><Input aria-label="Buscar función o módulo" placeholder="Buscar función o módulo…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="h-11 rounded-xl bg-card pl-9" /></div>
              <Button variant={soloCambios ? 'secondary' : 'outline'} className="h-11 rounded-xl" aria-pressed={soloCambios} onClick={() => setSoloCambios(!soloCambios)}>Solo cambios</Button>
              {(busqueda || soloCambios) && <Button variant="ghost" className="h-11 rounded-xl" onClick={() => { setBusqueda(''); setSoloCambios(false) }}>Limpiar filtros</Button>}
            </div>
          </div>
          <div className="max-h-[65vh] overflow-y-auto" aria-label={`Funciones de ${formatRol(seleccionado)}`}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-5 py-3 text-sm font-semibold text-heading"><span>Función · {formatRol(seleccionado)}</span><span>Acceso</span></div>
            {!funciones.length && <p className="p-8 text-center text-muted-foreground">No hay funciones con estos filtros. Tu borrador se conserva.</p>}
            {modulos.map((modulo) => <div key={modulo}>
              <h3 className="border-y border-border bg-muted/60 px-5 py-2.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">{modulo}</h3>
              {funciones.filter((f) => f.modulo === modulo).map((f) => {
                const clave = claveFuncion(f.id, seleccionado)
                const marcado = valorSeleccionado(config, editor.borrador, f, seleccionado)
                const cambiado = Object.hasOwn(editor.borrador, clave)
                const conflicto = editor.conflictos.some((c) => c.clave === clave)
                return <div key={f.id} className={`flex items-center justify-between gap-4 border-b border-border/60 px-5 py-4 ${cambiado ? marcado ? 'bg-emerald-500/5' : 'bg-destructive/5' : 'hover:bg-muted/30'}`}>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 break-words font-medium text-heading">{!f.delegable && <LockKeyhole className="size-4 shrink-0 text-muted-foreground" />}{f.nombre}</p>
                    {!f.delegable && <p className="mt-1 text-xs text-muted-foreground">{f.motivoProteccion}</p>}
                    {f.dependencias.length > 0 && <p className="mt-1 text-xs text-muted-foreground">Requiere: {f.dependencias.map((id) => config.funciones.find((d) => d.id === id)?.nombre ?? id).join(', ')}.</p>}
                    {cambiado ? <span className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold ${marcado ? 'text-emerald-700 dark:text-emerald-300' : 'text-destructive'}`}>{marcado ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}{editor.borrador[clave] === null ? 'Volverá al valor inicial' : marcado ? 'Se concederá' : 'Se retirará'}</span>
                      : <span className="mt-1 block text-xs text-muted-foreground">{ajuste(config, f.id, seleccionado) === null ? 'Valor inicial' : 'Personalizado'}</span>}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className={`hidden text-xs sm:block ${marcado ? 'font-medium text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'}`}>{marcado ? 'Permitido' : 'Sin acceso'}</span>
                    <Checkbox aria-label={`${f.nombre}: ${formatRol(seleccionado)}`} checked={marcado} disabled={editor.ocupado || !f.delegable || conflicto || editor.incierto}
                      onCheckedChange={(v) => { const nuevo = v === true; editor.cambiar(f.id, seleccionado, nuevo === valorInicial(f, seleccionado) ? null : nuevo) }}
                      className="size-5 aria-[checked=false]:border-2 aria-[checked=false]:border-black dark:aria-[checked=false]:border-white" />
                  </div>
                </div>
              })}
            </div>)}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5" aria-labelledby="resumen-cambios">
        <div className="flex items-center justify-between gap-3"><h2 id="resumen-cambios" className="font-semibold text-heading">Revisa y guarda</h2><Badge variant="outline">{editor.cambios.length} cambios pendientes</Badge></div>
        {editor.dependencias.length > 0 && <div className="mt-4"><Aviso tono="error">Antes de guardar, habilita las consultas que necesitan estas funciones: {editor.dependencias.map((d) => `${formatRol(d.rol)}: ${d.funcion} requiere ${d.requiere}`).join('; ')}.</Aviso></div>}
        <label htmlFor="motivo-funciones" className="mt-4 block text-sm font-medium text-heading">Motivo del cambio</label>
        <textarea id="motivo-funciones" rows={2} maxLength={160} value={editor.motivo} onChange={(e) => editor.setMotivo(e.target.value)} disabled={editor.ocupado} aria-describedby="ayuda-motivo-funciones" aria-invalid={!!editor.motivo && !!editor.errorMotivo}
          className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Explica por qué necesitas cambiar estos accesos…" />
        <p id="ayuda-motivo-funciones" className={`mt-1 text-xs ${editor.motivo && editor.errorMotivo ? 'text-destructive' : 'text-muted-foreground'}`}>{editor.errorMotivo ?? 'Motivo válido.'} · {editor.motivo.trim().length}/160 caracteres</p>
        <div className="mt-5 grid auto-rows-fr grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-3">
          <Button variant="outline" className="h-auto min-h-11 w-full min-w-0 rounded-xl px-4 py-2 text-center wrap-anywhere whitespace-normal" disabled={editor.ocupado || (!editor.cambios.length && !editor.motivo)} onClick={() => setConfirmacion('descartar')}>Descartar borrador</Button>
          <Button variant="outline" className="h-auto min-h-11 w-full min-w-0 rounded-xl px-4 py-2 text-center wrap-anywhere whitespace-normal" disabled={editor.ocupado} onClick={() => void editor.actualizar()}><RefreshCw className={editor.consulta.isFetching ? 'animate-spin' : ''} /> Actualizar configuración</Button>
          <Button className="h-auto min-h-11 w-full min-w-0 rounded-xl px-4 py-2 text-center wrap-anywhere whitespace-normal" disabled={!editor.puedeGuardar} onClick={() => setConfirmacion('guardar')}><Save /> Revisar y guardar</Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Actualizar configuración conserva tu borrador. Guardar no activa ni desactiva el control.</p>
      </section>

      <Dialog open={confirmacion !== null} onOpenChange={(open) => { if (!open && !editor.ocupado) setConfirmacion(null) }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>{confirmacion === 'guardar' ? 'Confirmar cambios de acceso' : confirmacion === 'restablecer' ? `Valores iniciales de ${formatRol(seleccionado)}` : 'Descartar el borrador'}</DialogTitle>
            <DialogDescription>{confirmacion === 'guardar' ? 'Estos son los cambios que se guardarán. Revisa el rol y la función antes de confirmar.' : confirmacion === 'restablecer' ? 'Solo se prepararán los valores iniciales de este rol. No se guardarán automáticamente ni se cambiarán otros roles.' : 'Se perderán los cambios locales y el motivo. La configuración guardada permanecerá igual.'}</DialogDescription></DialogHeader>
          {confirmacion === 'guardar' && <><ul className="max-h-64 space-y-2 overflow-y-auto">{editor.cambios.map((c) => <li key={claveFuncion(c.funcion, c.rol)} className="rounded-lg border border-border p-3 text-sm"><strong>{formatRol(c.rol)}</strong> · {config.funciones.find((f) => f.id === c.funcion)?.nombre ?? c.funcion}<span className="mt-1 block text-muted-foreground">{valorTexto(c.permitido)}</span></li>)}</ul><p className="text-sm"><strong>Motivo:</strong> {editor.motivo}</p></>}
          <DialogFooter className="grid grid-cols-2 gap-3 sm:space-x-0">
            <Button variant="outline" className="h-11 w-full rounded-xl" disabled={editor.ocupado} onClick={() => setConfirmacion(null)}>Volver al borrador</Button>
            <Button className="h-11 w-full rounded-xl" disabled={editor.ocupado} onClick={() => void confirmar()}><Check />{editor.ocupado ? 'Guardando…' : confirmacion === 'guardar' ? 'Confirmar guardado' : 'Confirmar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
