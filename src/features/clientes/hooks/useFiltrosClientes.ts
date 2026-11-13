import { useEffect, useRef, useState } from 'react'
import { FILTROS_INICIALES, type FiltrosClientes } from '@/features/clientes/lib/consulta'
import { crearBusquedaProgramada } from '@/features/clientes/lib/busqueda-programada'

export function useFiltrosClientes() {
  const [filtros, setFiltros] = useState(FILTROS_INICIALES)
  const [busqueda, setBusqueda] = useState({ filtros: FILTROS_INICIALES, page: 1 })
  const [programador] = useState(() => crearBusquedaProgramada(
    (actuales) => setBusqueda({ filtros: actuales, page: 1 }),
  ))
  const componiendo = useRef(false)

  useEffect(() => programador.cancelar, [programador])

  const cambiar = <K extends keyof FiltrosClientes>(campo: K, valor: FiltrosClientes[K]) => {
    const siguientes = { ...filtros, [campo]: valor }
    setFiltros(siguientes)
    if (campo === 'q' || campo === 'identificacion') {
      if (!componiendo.current) programador.programar(siguientes)
    } else {
      programador.aplicarAhora(siguientes)
    }
  }

  const limpiar = () => {
    componiendo.current = false
    setFiltros(FILTROS_INICIALES)
    programador.aplicarAhora(FILTROS_INICIALES)
  }

  return {
    filtros,
    busqueda,
    cambiar,
    limpiar,
    buscar: () => programador.aplicarAhora(filtros),
    iniciarComposicion: () => { componiendo.current = true; programador.cancelar() },
    terminarComposicion: (campo: 'q' | 'identificacion', valor: string) => {
      componiendo.current = false
      cambiar(campo, valor)
    },
    irAPagina: (page: number) => setBusqueda((actual) => ({ ...actual, page })),
  }
}
