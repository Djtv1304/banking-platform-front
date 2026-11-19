import { useState } from 'react'
import { refreshSession } from '@/features/auth/session'
import { Button } from '@/shared/ui'

/** Acción explícita: no añade consultas periódicas ni mantiene viva una sesión sola. */
export function ActualizarAccesosButton() {
  const [ocupado, setOcupado] = useState(false)
  const [fallo, setFallo] = useState(false)

  async function actualizar() {
    if (ocupado) return
    setOcupado(true)
    try {
      setFallo(!(await refreshSession()))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" size="sm" disabled={ocupado} onClick={() => void actualizar()}>
        {ocupado ? 'Actualizando…' : 'Actualizar accesos'}
      </Button>
      {fallo && <span role="alert" className="max-w-56 text-xs text-destructive">No pudimos actualizar los accesos. Inténtalo nuevamente.</span>}
    </div>
  )
}
