import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, ErrorApi, Input, Label } from '@/shared/ui'

type Accion = 'bloquear' | 'desbloquear' | 'reactivar'
const titulos: Record<Accion, string> = {
  bloquear: 'Bloquear cuenta',
  desbloquear: 'Solicitar desbloqueo',
  reactivar: 'Reactivar cuenta',
}

export function CambiarEstadoCuenta({ cuenta, accion }: { cuenta: number; accion: Accion }) {
  const [abierto, abrir] = useState(false)
  const [motivo, cambiarMotivo] = useState('')
  const [documento, cambiarDocumento] = useState('')
  const [solicitud, mostrarSolicitud] = useState<number | null>(null)
  const queries = useQueryClient()
  const catalogo = useQuery({
    queryKey: ['cuentas', 'motivos-bloqueo'],
    queryFn: async () => (await apiClient.get<{codigo: string; nombre: string}[]>('/api/v1/cuentas/catalogos/motivos-bloqueo')).data,
    enabled: abierto && accion === 'bloquear',
  })
  const guardar = useMutation({
    mutationFn: async () => apiClient.patch<{idSolicitud?: number}>(`/api/v1/cuentas/${cuenta}/estado`, {
      estado: accion === 'bloquear' ? 'BLOQUEADA' : 'ACTIVA',
      motivo: motivo.trim(),
      ...(accion === 'reactivar' ? { documentoVerificado: documento } : {}),
    }),
    onSuccess: async ({status, data}) => {
      if (status === 202 && data.idSolicitud) mostrarSolicitud(data.idSolicitud)
      abrir(false)
      await queries.invalidateQueries({ queryKey: ['cuentas'] })
    },
  })

  function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    guardar.mutate()
  }

  return (
    <>
      {solicitud !== null && <p role="status">Solicitud {solicitud} enviada. La cuenta sigue bloqueada hasta que otra persona apruebe.</p>}
      <Button variant="outline" onClick={() => abrir(true)}>{titulos[accion]}</Button>
      <Dialog open={abierto} onOpenChange={(valor) => { if (!guardar.isPending) abrir(valor) }}>
        <DialogContent>
          <DialogTitle>{titulos[accion]}</DialogTitle>
          <DialogDescription>{accion === 'desbloquear' ? 'Otra persona deberá aprobar la solicitud.' : 'El cambio se aplica al guardar.'}</DialogDescription>
          <form onSubmit={enviar} className="grid gap-4">
            <Label htmlFor="estado-motivo">Motivo</Label>
            {accion === 'bloquear' ? (
              <select id="estado-motivo" required value={motivo} onChange={e => cambiarMotivo(e.target.value)} className="rounded-md border p-2">
                <option value="">Selecciona un motivo</option>
                {catalogo.data?.map(item => <option key={item.codigo} value={item.codigo}>{item.nombre}</option>)}
              </select>
            ) : <Input id="estado-motivo" required maxLength={300} value={motivo} onChange={e => cambiarMotivo(e.target.value)} />}
            {accion === 'reactivar' && <>
              <Label htmlFor="estado-documento">Documento de identidad verificado</Label>
              <select id="estado-documento" required value={documento} onChange={e => cambiarDocumento(e.target.value)} className="rounded-md border p-2">
                <option value="">Selecciona un documento</option>
                <option value="C">Cédula</option><option value="P">Pasaporte</option><option value="R">RUC</option>
              </select>
            </>}
            {catalogo.isError && <ErrorApi error={catalogo.error} />}
            {guardar.isError && <ErrorApi error={guardar.error} />}
            <DialogFooter><Button type="submit" disabled={guardar.isPending || !motivo.trim() || (accion === 'reactivar' && !documento)}>{titulos[accion]}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
