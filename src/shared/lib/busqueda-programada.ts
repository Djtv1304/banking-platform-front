export const ESPERA_BUSQUEDA_MS = 350

/** Solo aplica la última entrada; filtros, Enter y Limpiar cancelan la espera. */
export function crearBusquedaProgramada<T>(aplicar: (valor: T) => void) {
  let temporizador: ReturnType<typeof setTimeout> | undefined

  const cancelar = () => {
    clearTimeout(temporizador)
    temporizador = undefined
  }

  const aplicarAhora = (valor: T) => {
    cancelar()
    aplicar(valor)
  }

  const programar = (valor: T) => {
    cancelar()
    temporizador = setTimeout(() => aplicarAhora(valor), ESPERA_BUSQUEDA_MS)
  }

  return { programar, aplicarAhora, cancelar }
}
