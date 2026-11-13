import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { crearBusquedaProgramada, ESPERA_BUSQUEDA_MS } from '@/features/clientes/lib/busqueda-programada'
import { FILTROS_INICIALES } from '@/features/clientes/lib/consulta'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('búsqueda automática de clientes', () => {
  it('espera una pausa y aplica solamente el último texto escrito', () => {
    const aplicar = vi.fn()
    const busqueda = crearBusquedaProgramada(aplicar)
    for (const q of ['M', 'Ma', 'María']) {
      busqueda.programar({ ...FILTROS_INICIALES, q })
      vi.advanceTimersByTime(100)
    }
    expect(aplicar).not.toHaveBeenCalled()
    vi.advanceTimersByTime(ESPERA_BUSQUEDA_MS)
    expect(aplicar).toHaveBeenCalledExactlyOnceWith({ ...FILTROS_INICIALES, q: 'María' })
  })

  it('Buscar o Enter ejecuta sin esperar y no repite la consulta después', () => {
    const aplicar = vi.fn()
    const busqueda = crearBusquedaProgramada(aplicar)
    const filtros = { ...FILTROS_INICIALES, identificacion: 'DEMO001' }
    busqueda.programar(filtros)
    busqueda.aplicarAhora(filtros)
    expect(aplicar).toHaveBeenCalledExactlyOnceWith(filtros)
    vi.runAllTimers()
    expect(aplicar).toHaveBeenCalledTimes(1)
  })

  it('aplica un filtro inmediatamente junto al texto pendiente sin restaurar valores antiguos', () => {
    const aplicar = vi.fn()
    const busqueda = crearBusquedaProgramada(aplicar)
    busqueda.programar({ ...FILTROS_INICIALES, q: 'Carlos' })
    busqueda.aplicarAhora({ ...FILTROS_INICIALES, q: 'Carlos', estado: 'Activo' })
    vi.runAllTimers()
    expect(aplicar).toHaveBeenCalledExactlyOnceWith({ ...FILTROS_INICIALES, q: 'Carlos', estado: 'Activo' })
  })

  it('Limpiar cancela el texto pendiente y mantiene los filtros vacíos', () => {
    const aplicar = vi.fn()
    const busqueda = crearBusquedaProgramada(aplicar)
    busqueda.programar({ ...FILTROS_INICIALES, q: 'Anterior' })
    busqueda.aplicarAhora(FILTROS_INICIALES)
    vi.runAllTimers()
    expect(aplicar).toHaveBeenCalledExactlyOnceWith(FILTROS_INICIALES)
  })

  it('salir de la pantalla o iniciar composición cancela la consulta pendiente', () => {
    const aplicar = vi.fn()
    const busqueda = crearBusquedaProgramada(aplicar)
    busqueda.programar({ ...FILTROS_INICIALES, q: 'Texto' })
    busqueda.cancelar()
    vi.runAllTimers()
    expect(aplicar).not.toHaveBeenCalled()
  })
})
