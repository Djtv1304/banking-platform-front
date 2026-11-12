import { useState } from 'react'
import { Pencil } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { Aviso, Button, Cargando } from '@/shared/ui'
import { EntidadForm } from '@/features/organizacion/components/EntidadForm'
import { TarjetaEntidad } from '@/features/organizacion/components/TarjetaEntidad'
import { useEntidad, usePuedeEditarEntidad } from '@/features/organizacion/hooks/useEntidad'
import { entidadNoRegistrada, mensajeErrorEntidad } from '@/features/organizacion/lib/entidad-texto'

/** Datos de la cooperativa: lectura y edición parcial (solo ADMIN) */
export function EntidadPage() {
  const entidad = useEntidad()
  const puedeEditar = usePuedeEditarEntidad()
  const [editando, setEditando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  const editar = () => {
    setGuardado(false)
    setEditando(true)
  }

  const alGuardar = () => {
    setEditando(false)
    setGuardado(true)
  }

  const contenido = (() => {
    if (entidad.isError) {
      const error = toApiError(entidad.error)
      if (entidadNoRegistrada(error)) return <Aviso>La entidad todavía no está registrada en el sistema.</Aviso>
      return <Aviso tono="error">{mensajeErrorEntidad(error, 'ver')}</Aviso>
    }
    if (entidad.isPending) return <Cargando texto="Consultando los datos de la entidad…" />
    if (editando) return <EntidadForm entidad={entidad.data} onCancelar={() => setEditando(false)} onGuardado={alGuardar} />

    return (
      <TarjetaEntidad entidad={entidad.data}>
        {puedeEditar && (
          <Button variant="outline" size="lg" onClick={editar} className="rounded-lg px-3">
            <Pencil />
            Editar
          </Button>
        )}
      </TarjetaEntidad>
    )
  })()

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header>
        <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">Datos de la entidad</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Información legal y de contacto de la cooperativa tal como está registrada en el sistema.
        </p>
      </header>

      {guardado && <Aviso>Guardamos los datos de la entidad.</Aviso>}
      {contenido}
    </div>
  )
}
