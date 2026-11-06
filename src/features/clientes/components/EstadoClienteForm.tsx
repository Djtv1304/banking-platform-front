import { useState, type FormEvent } from 'react'

import type { EstadoDestino } from '@/features/clientes/api/gestion-clientes'
import { ErrorClientes } from '@/features/clientes/components/consulta-clientes'
import { Field } from '@/features/clientes/components/form-fields'
import { Button } from '@/shared/ui'

export function EstadoClienteForm({ opciones, guardar, ocupado, error }: {
  opciones: EstadoDestino[]
  guardar: (estado: EstadoDestino, motivo: string) => Promise<void>
  ocupado: boolean
  error: Error | null
}) {
  const [estado, setEstado] = useState('')
  const [motivo, setMotivo] = useState('')
  const destino = opciones.find((opcion) => opcion === estado)

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!destino || !motivo.trim() || ocupado) return
    try {
      await guardar(destino, motivo.trim())
      setEstado('')
      setMotivo('')
    } catch {
      // Conserva el motivo cuando el servidor rechaza el cambio.
    }
  }

  return (
    <form className="grid gap-4 rounded-2xl border border-border bg-card p-5" onSubmit={(event) => void enviar(event)}>
      <h2 className="text-xl font-semibold text-heading">Cambiar estado</h2>
      {!opciones.length && <p className="text-muted-foreground">No hay cambios de estado disponibles.</p>}
      {!!opciones.length && (
        <fieldset disabled={ocupado} className="grid gap-4">
          <Field id="cliente-nuevo-estado" label="Nuevo estado">
            <select id="cliente-nuevo-estado" required value={destino ?? ''}
              className="h-10 rounded-lg border border-border bg-field px-3"
              onChange={(event) => setEstado(event.target.value)}>
              <option value="">Seleccionar</option>
              {opciones.map((opcion) => <option key={opcion}>{opcion}</option>)}
            </select>
          </Field>
          {destino === 'Eliminado' && <p className="text-sm text-muted-foreground">El registro se conserva para auditoría y ya no se podrá editar.</p>}
          <Field id="cliente-motivo-estado" label="Motivo">
            <textarea id="cliente-motivo-estado" required maxLength={500} value={motivo}
              className="min-h-24 rounded-lg border border-border bg-field p-3"
              onChange={(event) => setMotivo(event.target.value)} />
          </Field>
          <Button type="submit" className="justify-self-start" disabled={!destino || !motivo.trim()}>
            {ocupado ? 'Guardando…' : 'Confirmar cambio de estado'}
          </Button>
        </fieldset>
      )}
      {error && <ErrorClientes error={error} />}
    </form>
  )
}
