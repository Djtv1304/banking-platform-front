import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Asiento } from '@/features/contabilidad/api/asientos.contract'
import { AccionesAsiento } from '@/features/contabilidad/components/AccionesAsiento'
import { MENSAJE_ASIENTO_DE_OPERACION } from '@/features/contabilidad/lib/asiento-manual'

const permisos = vi.hoisted(() => ({ crear: true, reversar: true }))

vi.mock('@/shared/theme', () => ({ useThemeStore: vi.fn() }))
vi.mock('@/features/auth', () => ({
  useAuthStore: (seleccionar: (estado: { user: { roles: string[] } }) => unknown) => seleccionar({ user: { roles: ['CONTADOR'] } }),
  hasAnyRole: () => true,
  usePuedeFuncion: (funcion: string) => (funcion.endsWith('crear') ? permisos.crear : permisos.reversar),
}))
vi.mock('@/features/contabilidad/hooks/useAsientoManual', () => {
  const mutacion = () => ({ isPending: false, mutate: vi.fn() })
  return { useEnviarAsiento: mutacion, useAnularAsiento: mutacion, useSolicitarReverso: mutacion }
})

const asiento = (estado: string, origen = 'MANUAL', idAsientoReversion: number | null = null): Asiento => ({
  idAsientoContable: 7,
  numeroAsiento: 'AS-000007',
  fechaAsiento: '2026-11-16',
  idTipoAsiento: 1,
  origen,
  concepto: 'Provisión de intereses',
  totalDebito: 10,
  totalCredito: 10,
  estado,
  idAsientoReversion,
  idAgencia: '001',
  detalle: [],
})

const html = (a: Asiento) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <AccionesAsiento asiento={a} />
    </MemoryRouter>,
  )

beforeEach(() => {
  permisos.crear = true
  permisos.reversar = true
})

describe('AccionesAsiento', () => {
  it('un borrador con permiso muestra editar (enlace), enviar y anular', () => {
    const salida = html(asiento('BORRADOR'))
    expect(salida).toContain('href="/contabilidad/asientos/7/editar"')
    expect(salida).toContain('Editar borrador')
    expect(salida).toContain('Enviar a aprobación')
    expect(salida).toContain('Anular borrador')
    expect(salida).not.toContain('Solicitar reverso')
  })

  it('un manual contabilizado con permiso muestra solicitar reverso', () => {
    const salida = html(asiento('CONTABILIZADO'))
    expect(salida).toContain('Solicitar reverso')
    expect(salida).not.toContain('Enviar a aprobación')
    expect(salida).not.toContain(MENSAJE_ASIENTO_DE_OPERACION)
  })

  it('un contabilizado de caja no se reversa y explica por qué', () => {
    const salida = html(asiento('CONTABILIZADO', 'CAJA'))
    expect(salida).not.toContain('Solicitar reverso')
    expect(salida).toContain(MENSAJE_ASIENTO_DE_OPERACION)
  })

  it('un reverso no ofrece reversarse otra vez', () => {
    expect(html(asiento('CONTABILIZADO', 'MANUAL', 3))).not.toContain('Solicitar reverso')
  })

  it('sin permisos no hay acciones ni nota', () => {
    permisos.crear = false
    permisos.reversar = false
    expect(html(asiento('BORRADOR'))).toBe('')
    expect(html(asiento('CONTABILIZADO'))).toBe('')
    expect(html(asiento('CONTABILIZADO', 'CAJA'))).toBe('')
  })
})
