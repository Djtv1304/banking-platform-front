import type { FiltrosClientes } from '@/features/clientes/lib/consulta'

export const ESPERA_BUSQUEDA_MS = 350

/** Solo se aplica la última entrada; Buscar, filtros y Limpiar cancelan la espera. */
export function crearBusquedaProgramada(aplicar: (filtros: FiltrosClientes) => void) {
  let temporizador: ReturnType<typeof setTimeout> | undefined

  const cancelar = () => {
    clearTimeout(temporizador)
    temporizador = undefined
  }

  const aplicarAhora = (filtros: FiltrosClientes) => {
    cancelar()
    aplicar(filtros)
  }

  const programar = (filtros: FiltrosClientes) => {
    cancelar()
    temporizador = setTimeout(() => aplicarAhora(filtros), ESPERA_BUSQUEDA_MS)
  }

  return { programar, aplicarAhora, cancelar }
}
