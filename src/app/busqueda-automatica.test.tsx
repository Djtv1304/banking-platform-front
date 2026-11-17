import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { FormEvent, KeyboardEvent } from 'react'
import { useBusquedaAutomatica } from '@/shared/lib/useBusquedaAutomatica'
import { ESPERA_BUSQUEDA_MS } from '@/shared/lib/busqueda-programada'
import { filtrosCuentasSchema, FILTROS_VACIOS } from '@/features/cuenta/lib/filtros'
import { filtrosMovimientosSchema } from '@/features/cuenta/lib/movimientos'

function controles(aplicar: () => void) {
  let resultado!: ReturnType<typeof useBusquedaAutomatica>
  function Prueba() {
    resultado = useBusquedaAutomatica(aplicar)
    return null
  }
  renderToStaticMarkup(<Prueba />)
  return resultado
}

const cambio = (tagName = 'INPUT', type = 'text') =>
  ({ target: { tagName, type } }) as unknown as FormEvent<HTMLFormElement>

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('consultas automáticas con los contratos de los módulos', () => {
  it('agrupa pulsaciones y aplica solo el último borrador después de 350 ms', () => {
    let texto = 'A'
    const aplicar = vi.fn()
    const busqueda = controles(() => aplicar(texto))
    busqueda.eventos.onChange(cambio())
    vi.advanceTimersByTime(200)
    texto = 'Ana'
    busqueda.eventos.onChange(cambio())
    vi.advanceTimersByTime(ESPERA_BUSQUEDA_MS - 1)
    expect(aplicar).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(aplicar).toHaveBeenCalledExactlyOnceWith('Ana')
  })

  it.each([['SELECT', 'select-one'], ['INPUT', 'date']])('aplica %s/%s inmediatamente y cancela texto pendiente', (tag, type) => {
    const aplicar = vi.fn()
    const busqueda = controles(aplicar)
    busqueda.eventos.onChange(cambio())
    busqueda.eventos.onChange(cambio(tag, type))
    expect(aplicar).toHaveBeenCalledTimes(1)
    vi.runAllTimers()
    expect(aplicar).toHaveBeenCalledTimes(1)
  })

  it('no consulta durante composición de teclado y aplica una sola vez al terminar', () => {
    const aplicar = vi.fn()
    const busqueda = controles(aplicar)
    busqueda.eventos.onChange(cambio())
    busqueda.eventos.onCompositionStart()
    busqueda.eventos.onChange(cambio())
    vi.runAllTimers()
    expect(aplicar).not.toHaveBeenCalled()
    busqueda.eventos.onCompositionEnd()
    busqueda.eventos.onChange(cambio())
    vi.runAllTimers()
    expect(aplicar).toHaveBeenCalledTimes(1)
  })

  it('Limpiar o Enter cancelan el texto anterior para que no reaparezca después', () => {
    const aplicar = vi.fn()
    const busqueda = controles(aplicar)
    busqueda.eventos.onChange(cambio())
    busqueda.cancelar()
    aplicar()
    vi.runAllTimers()
    expect(aplicar).toHaveBeenCalledTimes(1)
  })

  it('Enter busca inmediatamente incluso en formularios con varios campos sin botón Buscar', () => {
    const aplicar = vi.fn()
    const busqueda = controles(aplicar)
    const preventDefault = vi.fn()
    const enter = { key: 'Enter', target: { tagName: 'INPUT' }, nativeEvent: { isComposing: false }, preventDefault } as unknown as KeyboardEvent<HTMLFormElement>
    busqueda.eventos.onChange(cambio())
    busqueda.eventos.onKeyDown(enter)
    expect(preventDefault).toHaveBeenCalledTimes(1)
    expect(aplicar).toHaveBeenCalledTimes(1)
    vi.runAllTimers()
    expect(aplicar).toHaveBeenCalledTimes(1)
  })

  it('no envía una identificación incompleta; acepta la completa con el contrato actual', () => {
    let filtros = { ...FILTROS_VACIOS, identificacion: '010' }
    const aplicar = vi.fn()
    const busqueda = controles(() => {
      const resultado = filtrosCuentasSchema.safeParse(filtros)
      if (resultado.success) aplicar(resultado.data)
    })
    busqueda.eventos.onChange(cambio())
    vi.runAllTimers()
    expect(aplicar).not.toHaveBeenCalled()
    filtros = { ...filtros, identificacion: '0100000025' }
    busqueda.eventos.onChange(cambio())
    vi.runAllTimers()
    expect(aplicar).toHaveBeenCalledExactlyOnceWith(filtros)
  })

  it('conserva la validación del rango de movimientos antes de consultar', () => {
    let filtros = { desde: '2026-11-20', hasta: '2026-11-01', tipoTransaccion: '' }
    const aplicar = vi.fn()
    const busqueda = controles(() => {
      const resultado = filtrosMovimientosSchema.safeParse(filtros)
      if (resultado.success) aplicar(resultado.data)
    })
    busqueda.eventos.onChange(cambio('INPUT', 'date'))
    expect(aplicar).not.toHaveBeenCalled()
    filtros = { ...filtros, hasta: '2026-11-30' }
    busqueda.eventos.onChange(cambio('INPUT', 'date'))
    expect(aplicar).toHaveBeenCalledExactlyOnceWith(filtros)
  })
})
