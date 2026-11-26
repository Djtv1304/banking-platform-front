import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CampoEnmascarado, PanelRevelacion } from '@/features/clientes/components/CampoEnmascarado'
import type { ControlRevelacion } from '@/features/clientes/hooks/useRevelacion'
import { REVELACION_INICIAL, type EstadoRevelacion } from '@/features/clientes/lib/revelacion'

const h = vi.hoisted(() => ({ puede: true, estado: null as unknown as EstadoRevelacion, campos: [] as unknown[] }))

vi.mock('@/shared/theme', () => ({ useThemeStore: vi.fn() }))
vi.mock('@/features/clientes/hooks/useRevelacion', () => ({
  usePuedeVerSensible: () => h.puede,
  useRevelacion: (_id: number, campos: unknown[]) => {
    h.campos = campos
    return { estado: h.estado, abrir: vi.fn(), enviar: vi.fn(), escribirCodigo: vi.fn(), ocultar: vi.fn() }
  },
}))

const control = (estado: Partial<EstadoRevelacion>): ControlRevelacion =>
  ({ estado: { ...REVELACION_INICIAL, ...estado }, abrir: vi.fn(), enviar: vi.fn(), escribirCodigo: vi.fn(), ocultar: vi.fn() })
const campo = () => renderToStaticMarkup(<CampoEnmascarado idCliente={42} campo="identificacion" valor="******4065" etiqueta="el documento" />)

beforeEach(() => {
  h.puede = true
  h.estado = REVELACION_INICIAL
})

describe('E5-05 · CampoEnmascarado', () => {
  it('muestra el valor enmascarado y ofrece verlo completo a quien puede', () => {
    const html = campo()
    expect(html).toContain('******4065')
    expect(html).toContain('Mostrar valor completo')
    expect(html).toContain('aria-label="Mostrar valor completo de el documento"')
    expect(h.campos).toEqual(['identificacion'])
  })

  it('sin clientes.verSensible solo muestra la máscara', () => {
    h.puede = false
    const html = campo()
    expect(html).toContain('******4065')
    expect(html).not.toContain('Mostrar valor completo')
  })

  it('con el valor revelado lo muestra con Ocultar y avisa que se oculta solo', () => {
    h.estado = { ...REVELACION_INICIAL, fase: 'visible', datos: { identificacion: '1710034065', email: null, telefonoCelular: null, telefonoConvencional: null, correosSecundarios: null } }
    const html = campo()
    expect(html).toContain('1710034065')
    expect(html).not.toContain('******4065')
    expect(html).toContain('Ocultar')
    expect(html).toContain('60 segundos')
    expect(html).not.toContain('Mostrar valor completo')
  })
})

describe('E5-05 · PanelRevelacion', () => {
  const panel = (estado: Partial<EstadoRevelacion>) =>
    renderToStaticMarkup(<PanelRevelacion id="revelar" etiqueta="el documento" control={control(estado)} />)

  it('cerrado no muestra nada', () => {
    expect(panel({})).toBe('')
  })

  it('pide el código de 6 dígitos y aclara que la consulta queda registrada', () => {
    const html = panel({ fase: 'codigo', idDesafio: 'd1', codigo: '123' })
    expect(html).toContain('queda registrada')
    expect(html).toContain('inputMode="numeric"')
    expect(html).toContain('autoComplete="one-time-code"')
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled/)
  })

  it('con un código completo permite enviar', () => {
    expect(panel({ fase: 'codigo', idDesafio: 'd1', codigo: '123456' })).not.toMatch(/<button[^>]*type="submit"[^>]*disabled/)
  })

  it('tras MFA_INVALIDO muestra el error y ofrece pedir un código nuevo', () => {
    const html = panel({ fase: 'codigo', idDesafio: null, error: 'El código no es válido o ya expiró.' })
    expect(html).toContain('role="alert"')
    expect(html).toContain('El código no es válido o ya expiró.')
    expect(html).toContain('Pedir un código nuevo')
    expect(html).not.toContain('one-time-code')
  })

  it('mientras prepara el desafío lo indica', () => {
    expect(panel({ fase: 'pidiendo' })).toContain('Preparando la verificación')
  })
})
