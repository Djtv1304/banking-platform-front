import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { IndicadorHabilitacion } from '@/features/clientes/components/IndicadorHabilitacion'

const h = vi.hoisted(() => ({ consulta: {} as Record<string, unknown>, clave: [] as unknown[] }))

vi.mock('@/shared/theme', () => ({ useThemeStore: vi.fn() }))
vi.mock('@tanstack/react-query', () => ({
  useQuery: (opciones: { queryKey: unknown[] }) => { h.clave = opciones.queryKey; return h.consulta },
}))

const render = (consulta: Record<string, unknown>) => {
  h.consulta = consulta
  return renderToStaticMarkup(<IndicadorHabilitacion idCliente={42} />)
}

describe('E5-05 · IndicadorHabilitacion', () => {
  it('habilitado', () => {
    expect(render({ isPending: false, isError: false, data: { habilitado: true, motivos: [] } })).toContain('Puede recibir productos')
    expect(h.clave).toEqual(['clientes', 'habilitacion', 42])
  })

  it('no habilitado con motivos legibles, sin los informativos', () => {
    const html = render({ isPending: false, isError: false, data: { habilitado: false, motivos: ['CLIENTE_NO_ACTIVO', 'ARCHIVOS_NO_EXIGIDOS'] } })
    expect(html).toContain('No puede recibir productos')
    expect(html).toContain('El cliente debe estar activo.')
    expect(html).not.toContain('ARCHIVOS_NO_EXIGIDOS')
  })

  it('carga y error', () => {
    expect(render({ isPending: true })).toContain('Verificando')
    expect(render({ isPending: false, isError: true, refetch: vi.fn() })).toContain('No pudimos verificar')
  })
})
