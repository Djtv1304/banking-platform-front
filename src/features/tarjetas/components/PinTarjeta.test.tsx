import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { Tarjeta } from '@/features/tarjetas/api/tarjetas.contract'
import { PinTarjeta } from '@/features/tarjetas/components/PinTarjeta'

vi.mock('@/shared/ui', () => ({
  Button: ({ children, ...props }: ComponentProps<'button'>) => <button {...props}>{children}</button>,
  Aviso: ({ children }: ComponentProps<'div'>) => <div>{children}</div>,
  Dialog: () => null,
  DialogContent: () => null,
  DialogDescription: () => null,
  DialogFooter: () => null,
  DialogHeader: () => null,
  DialogTitle: () => null,
}))
vi.mock('@/features/tarjetas/hooks/useAccionesTarjeta', () => ({
  useRegenerarPin: () => ({ isPending: false, isError: false, mutate: vi.fn() }),
  useDescargarSobrePin: () => ({ isPending: false, isError: false, mutate: vi.fn() }),
}))

const base = { idTarjeta: 7, numeroEnmascarado: '5412 **** **** 0007', tipoTarjeta: 'Debito', estadoActual: 'Activa', pinAsignado: true }
const tarjeta = (cambios: Partial<Tarjeta> = {}) => ({ ...base, ...cambios }) as Tarjeta
const TODOS = { estado: true, pin: true, sobrePin: true, historial: true }
const html = (t: Tarjeta, permisos = TODOS) => renderToStaticMarkup(<PinTarjeta tarjeta={t} permisos={permisos} />)

describe('PinTarjeta', () => {
  it('débito con PIN: regenerar y descargar el sobre', () => {
    const salida = html(tarjeta())
    expect(salida).toContain('Regenerar PIN')
    expect(salida).toContain('Descargar sobre de PIN')
  })

  it('crédito no tiene sobre de PIN', () => {
    const salida = html(tarjeta({ tipoTarjeta: 'Credito' }))
    expect(salida).toContain('Regenerar PIN')
    expect(salida).not.toContain('Descargar sobre')
  })

  it('sin PIN asignado o en un estado terminal no hay nada que hacer', () => {
    expect(html(tarjeta({ pinAsignado: false }))).toBe('')
    expect(html(tarjeta({ estadoActual: 'Cerrada', tipoTarjeta: 'Credito' }))).toBe('')
  })

  it('cada botón depende de su permiso o rol', () => {
    const soloSobre = html(tarjeta(), { ...TODOS, pin: false })
    expect(soloSobre).not.toContain('Regenerar PIN')
    expect(soloSobre).toContain('Descargar sobre de PIN')
    expect(html(tarjeta(), { ...TODOS, pin: false, sobrePin: false })).toBe('')
  })
})
