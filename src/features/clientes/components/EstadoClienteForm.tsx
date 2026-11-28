import { useEffect, useState, type FormEvent } from 'react'

import type { EstadoDestino } from '@/features/clientes/api/gestion-clientes'
import { ErrorClientes } from '@/features/clientes/components/consulta-clientes'
import { Field, fieldClassName } from '@/features/clientes/components/form-fields'
import { requiereAprobacionEstado } from '@/features/clientes/lib/gestion-clientes'
import { Aviso, Button } from '@/shared/ui'

export interface EstadoClienteFormProps {
  estadoActual: string
  opciones: EstadoDestino[]
  guardar: (estado: EstadoDestino, motivo: string) => Promise<void>
  ocupado: boolean
  error: Error | null
  onBorrador?: (sucio: boolean) => void
  valoresIniciales?: {
    destino?: EstadoDestino
    motivo?: string
    palabraConfirmacion?: string
  }
}

export function EstadoClienteForm({
  estadoActual = '',
  opciones,
  guardar,
  ocupado,
  error,
  onBorrador,
  valoresIniciales,
}: EstadoClienteFormProps) {
  const [estado, setEstado] = useState<string>(valoresIniciales?.destino ?? '')
  const [motivo, setMotivo] = useState(valoresIniciales?.motivo ?? '')
  const [palabraConfirmacion, setPalabraConfirmacion] = useState(valoresIniciales?.palabraConfirmacion ?? '')
  const hayBorrador = Boolean(estado || motivo || palabraConfirmacion)
  useEffect(() => onBorrador?.(hayBorrador), [hayBorrador, onBorrador])

  const destino = opciones.find((opcion) => opcion === estado)
  const requiereAprobacion = Boolean(destino && requiereAprobacionEstado(estadoActual, destino))
  const esEliminado = destino === 'Eliminado'
  const confirmacionEliminarValida = !esEliminado || palabraConfirmacion.trim() === 'ELIMINAR'
  const deshabilitado = !destino || !motivo.trim() || !confirmacionEliminarValida || ocupado

  const textoBoton = ocupado
    ? 'Guardando…'
    : requiereAprobacion
      ? 'Enviar a aprobación'
      : 'Confirmar cambio de estado'

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!destino || !motivo.trim() || !confirmacionEliminarValida || ocupado) return
    try {
      await guardar(destino, motivo.trim())
      setEstado('')
      setMotivo('')
      setPalabraConfirmacion('')
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
            <select
              id="cliente-nuevo-estado"
              required
              value={destino ?? ''}
              className={`${fieldClassName} w-full border text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:scheme-dark`}
              onChange={(event) => {
                setEstado(event.target.value)
                setPalabraConfirmacion('')
              }}
            >
              <option value="">Seleccionar</option>
              {opciones.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {opcion}
                </option>
              ))}
            </select>
          </Field>
          {requiereAprobacion && (
            <Aviso>
              <p>Este cambio requiere la aprobación de un supervisor o administrador y no se aplica hasta entonces.</p>
            </Aviso>
          )}
          {esEliminado && (
            <div className="grid gap-4">
              <Aviso tono="error">
                <p>Eliminar es irreversible: el cliente no podrá volver a operar y sus datos personales se anonimizarán al aprobarse. El documento queda reservado.</p>
              </Aviso>
              <Field id="cliente-confirmar-eliminar" label="Para confirmar, escribe la palabra ELIMINAR">
                <input
                  id="cliente-confirmar-eliminar"
                  type="text"
                  required
                  value={palabraConfirmacion}
                  placeholder="ELIMINAR"
                  className={`${fieldClassName} w-full border text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50`}
                  onChange={(event) => setPalabraConfirmacion(event.target.value)}
                />
              </Field>
            </div>
          )}
          <Field id="cliente-motivo-estado" label="Motivo">
            <textarea
              id="cliente-motivo-estado"
              required
              maxLength={300}
              value={motivo}
              className="min-h-24 rounded-xl border border-border bg-field p-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-describedby="cliente-motivo-ayuda"
              onChange={(event) => setMotivo(event.target.value)}
            />
            <p id="cliente-motivo-ayuda" className="text-sm text-muted-foreground">
              {motivo.length}/300 caracteres.
            </p>
          </Field>
          <Button type="submit" className="justify-self-start" disabled={deshabilitado}>
            {textoBoton}
          </Button>
        </fieldset>
      )}
      {error && <ErrorClientes error={error} />}
    </form>
  )
}
