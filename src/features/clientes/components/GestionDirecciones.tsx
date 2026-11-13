import { useState } from 'react'
import { CircleAlert, LoaderCircle, MapPin, Plus, Star } from 'lucide-react'
import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui'
import type { DireccionGestion, DireccionNueva } from '@/features/clientes/api/direcciones.contract'
import { useDirecciones } from '@/features/clientes/hooks/useDirecciones'
import { accionesDireccion, cambiosDireccion } from '@/features/clientes/lib/direcciones'
import { DireccionForm } from '@/features/clientes/components/DireccionForm'

interface Props { idCliente: number; soloLectura?: boolean }
type Confirmacion = { accion: 'principal' | 'baja'; direccion: DireccionGestion }

export function GestionDirecciones({ idCliente, soloLectura = false }: Props) {
  const { consulta, alta, edicion, baja, pendiente } = useDirecciones(idCliente)
  const [formulario, setFormulario] = useState<DireccionGestion | 'nueva' | null>(null)
  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const activas = (consulta.data ?? []).filter((d) => d.estado === 'Activo').sort((a, b) => Number(b.esPrincipal) - Number(a.esPrincipal))
  const inactivas = (consulta.data ?? []).filter((d) => d.estado === 'Inactivo')
  const bloqueado = pendiente || consulta.isFetching || consulta.isError || soloLectura
  const abrir = (direccion: DireccionGestion | 'nueva') => { setError(null); setMensaje(null); setFormulario(direccion) }

  async function guardar(body: DireccionNueva) {
    setError(null)
    try {
      if (formulario === 'nueva') await alta.mutateAsync(body)
      else if (formulario) {
        const cambios = cambiosDireccion(formulario, body)
        if (!Object.keys(cambios).length) { setFormulario(null); setMensaje('No había cambios para guardar.'); return }
        await edicion.mutateAsync({ id: formulario.idDireccion, body: cambios })
      }
      setFormulario(null)
      setMensaje('Dirección guardada correctamente.')
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar la dirección. Tu borrador se conserva.') }
  }

  async function confirmar() {
    if (!confirmacion) return
    setError(null)
    try {
      if (confirmacion.accion === 'principal') {
        await edicion.mutateAsync({ id: confirmacion.direccion.idDireccion, body: { esPrincipal: true } })
        setMensaje('La dirección principal se actualizó correctamente.')
      } else {
        await baja.mutateAsync(confirmacion.direccion.idDireccion)
        setMensaje('Dirección eliminada del listado activo.')
      }
      setConfirmacion(null)
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la operación. Inténtalo nuevamente.') }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{activas.length} {activas.length === 1 ? 'dirección activa' : 'direcciones activas'}</p>
        {!soloLectura && <Button type="button" disabled={bloqueado || !consulta.data} onClick={() => abrir('nueva')}><Plus className="size-4" />Agregar dirección</Button>}
      </div>
      {mensaje && <p role="status" className="rounded-xl border border-border bg-muted p-3 text-sm text-heading">{mensaje}</p>}
      {soloLectura && <p className="text-sm text-muted-foreground">El cliente está eliminado; sus direcciones se muestran solo para consulta.</p>}
      {consulta.isPending && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Cargando direcciones…</p>}
      {consulta.isError && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
        <p className="flex flex-1 items-center gap-2 text-sm text-destructive"><CircleAlert className="size-4 shrink-0" />{consulta.error.message}</p>
        <Button type="button" variant="outline" disabled={consulta.isFetching} onClick={() => void consulta.refetch()}>Reintentar</Button>
      </div>}
      {!consulta.isPending && !consulta.isError && activas.length === 0 && <p className="text-sm text-muted-foreground">El cliente no tiene direcciones activas.</p>}
      <ul className="flex flex-col gap-3">
        {activas.map((direccion) => <DireccionCard key={direccion.idDireccion} direccion={direccion} bloqueado={bloqueado}
          onEditar={() => abrir(direccion)} onAccion={(accion) => { setError(null); setMensaje(null); setConfirmacion({ accion, direccion }) }} />)}
      </ul>
      {inactivas.length > 0 && <details className="rounded-xl border border-border p-4">
        <summary className="cursor-pointer text-sm font-semibold text-heading">Direcciones inactivas ({inactivas.length})</summary>
        <ul className="mt-4 flex flex-col gap-3">{inactivas.map((direccion) => <DireccionCard key={direccion.idDireccion} direccion={direccion} bloqueado />)}</ul>
      </details>}
      <Dialog open={formulario !== null} onOpenChange={(open) => { if (!open && !pendiente) setFormulario(null) }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl" showCloseButton={!pendiente}>
          <DialogHeader>
            <DialogTitle>{formulario === 'nueva' ? 'Agregar dirección' : 'Editar dirección'}</DialogTitle>
            <DialogDescription>Completa los datos de ubicación del cliente. Los campos marcados como opcionales pueden quedar vacíos.</DialogDescription>
          </DialogHeader>
          {formulario && <DireccionForm key={formulario === 'nueva' ? 'nueva' : formulario.idDireccion} direccion={formulario === 'nueva' ? undefined : formulario}
            pendiente={pendiente} error={error} onGuardar={guardar} onCancelar={() => setFormulario(null)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={confirmacion !== null} onOpenChange={(open) => { if (!open && !pendiente) setConfirmacion(null) }}>
        <DialogContent showCloseButton={!pendiente}>
          <DialogHeader>
            <DialogTitle>{confirmacion?.accion === 'principal' ? 'Cambiar dirección principal' : 'Eliminar dirección'}</DialogTitle>
            <DialogDescription>{confirmacion?.accion === 'principal' ? 'Esta dirección será la principal. La anterior seguirá activa, pero dejará de ser principal.' : 'La dirección dejará de aparecer entre las activas. Su registro se conservará.'}</DialogDescription>
          </DialogHeader>
          <p className="break-words font-medium text-heading">{confirmacion?.direccion.calleDireccion}</p>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" size="form" disabled={pendiente} onClick={() => setConfirmacion(null)}>Cancelar</Button>
            <Button type="button" size="form" disabled={pendiente} variant={confirmacion?.accion === 'baja' ? 'destructive' : 'default'} onClick={() => void confirmar()}>
              {pendiente && <LoaderCircle className="size-4 animate-spin" />}{pendiente ? 'Procesando…' : confirmacion?.accion === 'baja' ? 'Eliminar dirección' : 'Confirmar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DireccionCard({ direccion, bloqueado, onEditar, onAccion }: {
  direccion: DireccionGestion; bloqueado: boolean; onEditar?: () => void; onAccion?: (accion: 'principal' | 'baja') => void
}) {
  const acciones = accionesDireccion(direccion)
  return <li className="flex gap-4 rounded-xl border border-border bg-field px-4 py-3">
    <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <p className="flex flex-wrap items-center gap-2 font-semibold text-heading">{direccion.tipoDireccion}
        {direccion.esPrincipal && direccion.estado === 'Activo' && <Badge><Star className="size-3" />Principal</Badge>}
        {direccion.estado === 'Inactivo' && <Badge variant="outline">Inactiva</Badge>}
      </p>
      <p className="break-words text-sm text-foreground">{direccion.calleDireccion}</p>
      {direccion.sector && <p className="text-sm text-muted-foreground">Sector: {direccion.sector}</p>}
      <p className="break-words text-sm text-muted-foreground">Referencia: {direccion.referenciaUbicacion}</p>
      {direccion.codigoPostal && <p className="text-sm text-muted-foreground">Código postal: {direccion.codigoPostal}</p>}
      {onEditar && <div className="flex flex-wrap gap-2 pt-1">
        {acciones.editar && <Button type="button" variant="outline" size="sm" disabled={bloqueado} onClick={onEditar} aria-label={`Editar dirección ${direccion.calleDireccion}`}>Editar</Button>}
        {acciones.principal && <Button type="button" variant="outline" size="sm" disabled={bloqueado} onClick={() => onAccion?.('principal')} aria-label={`Hacer principal la dirección ${direccion.calleDireccion}`}>Hacer principal</Button>}
        {acciones.baja && <Button type="button" variant="ghost" size="sm" disabled={bloqueado} onClick={() => onAccion?.('baja')} aria-label={`Eliminar dirección ${direccion.calleDireccion}`}>Eliminar dirección</Button>}
      </div>}
      {onEditar && direccion.esPrincipal && <p className="text-xs text-muted-foreground">Para eliminarla, elige primero otra dirección principal.</p>}
    </div>
  </li>
}
