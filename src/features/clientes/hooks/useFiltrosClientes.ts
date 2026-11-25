import { useEffect, useRef, useState } from 'react'
import { FILTROS_INICIALES, FILTROS_TEXTO, type FiltrosClientes } from '@/features/clientes/lib/consulta'
import { crearBusquedaProgramada } from '@/features/clientes/lib/busqueda-programada'

type FiltroTexto = (typeof FILTROS_TEXTO)[number]
const esTexto = (campo: keyof FiltrosClientes): campo is FiltroTexto => (FILTROS_TEXTO as readonly string[]).includes(campo)

/**
 * Filtros de la búsqueda en el estado del componente: documento, nombre y correo son datos
 * personales y no deben quedar en la URL ni en el historial del navegador (ASVS 14.2.1).
 */
export function useFiltrosClientes() {
  const [filtros, setFiltros] = useState(FILTROS_INICIALES)
  const [busqueda, setBusqueda] = useState({ filtros: FILTROS_INICIALES, page: 1 })
  const [programador] = useState(() => crearBusquedaProgramada<FiltrosClientes>(
    (actuales) => setBusqueda({ filtros: actuales, page: 1 }),
  ))
  const componiendo = useRef(false)

  useEffect(() => programador.cancelar, [programador])

  const cambiar = <K extends keyof FiltrosClientes>(campo: K, valor: FiltrosClientes[K]) => {
    const siguientes = { ...filtros, [campo]: valor }
    setFiltros(siguientes)
    if (esTexto(campo)) {
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
    terminarComposicion: (campo: FiltroTexto, valor: string) => {
      componiendo.current = false
      cambiar(campo, valor)
    },
    irAPagina: (page: number) => setBusqueda((actual) => ({ ...actual, page })),
  }
}
