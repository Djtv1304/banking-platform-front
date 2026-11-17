import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { crearBusquedaProgramada } from '@/shared/lib/busqueda-programada'

/** Se usa solo en consultas. Cada formulario conserva su validación y sus contratos. */
export function useBusquedaAutomatica(aplicar: () => void) {
  const [programador] = useState(() => crearBusquedaProgramada<() => void>((consulta) => consulta()))
  const componiendo = useRef(false)

  useEffect(() => programador.cancelar, [programador])

  const cambiar = (evento: FormEvent<HTMLFormElement>) => {
    programador.cancelar()
    if (componiendo.current) return
    const campo = evento.target as HTMLInputElement | HTMLSelectElement
    if (campo.tagName === 'SELECT' || campo.type === 'date') programador.aplicarAhora(aplicar)
    else programador.programar(aplicar)
  }

  return {
    cancelar: programador.cancelar,
    eventos: {
      onChange: cambiar,
      onKeyDown: (evento: KeyboardEvent<HTMLFormElement>) => {
        const campo = evento.target as HTMLInputElement
        if (evento.key !== 'Enter' || campo.tagName !== 'INPUT') return
        if (componiendo.current || evento.nativeEvent.isComposing) return
        evento.preventDefault()
        programador.aplicarAhora(aplicar)
      },
      onCompositionStart: () => {
        componiendo.current = true
        programador.cancelar()
      },
      onCompositionEnd: () => {
        componiendo.current = false
        programador.programar(aplicar)
      },
    },
  }
}
