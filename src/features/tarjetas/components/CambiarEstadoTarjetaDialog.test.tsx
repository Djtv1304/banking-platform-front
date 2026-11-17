import type { ComponentProps, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { Tarjeta } from '@/features/tarjetas/api/tarjetas.contract'
import { CambiarEstadoTarjetaDialog } from '@/features/tarjetas/components/CambiarEstadoTarjetaDialog'
import type { AccionEstado } from '@/features/tarjetas/lib/acciones-tarjeta'

const div = vi.hoisted(() => ({ children }: { children?: unknown }) => children as never)
vi.mock('@/shared/ui', () => ({
  Button: ({ children, ...props }: ComponentProps<'button'>) => <button {...props}>{children}</button>,
  Aviso: div,
  Dialog: ({ children, open }: { children: ReactNode; open: boolean }) => (open ? <div>{children}</div> : null),
  DialogContent: div,
  DialogDescription: div,
  DialogFooter: div,
  DialogHeader: div,
  DialogTitle: div,
  Label: ({ children, htmlFor }: ComponentProps<'label'>) => <label htmlFor={htmlFor}>{children}</label>,
  Select: div,
  SelectContent: div,
  SelectItem: div,
  SelectTrigger: ({ id }: ComponentProps<'button'>) => <button id={id} />,
  SelectValue: () => null,
}))
vi.mock('@/features/tarjetas/hooks/useAccionesTarjeta', () => ({
  useCambiarEstadoTarjeta: () => ({ isPending: false, isError: false, mutate: vi.fn() }),
}))

const tarjeta = { idTarjeta: 7, numeroEnmascarado: '5412 **** **** 0007', estadoActual: 'Activa' } as Tarjeta
const html = (accion: AccionEstado | null) =>
  renderToStaticMarkup(<CambiarEstadoTarjetaDialog tarjeta={tarjeta} accion={accion} onCerrar={vi.fn()} onCambiado={vi.fn()} />)

describe('CambiarEstadoTarjetaDialog', () => {
  it('cerrado no muestra nada', () => {
    expect(html(null)).toBe('')
  })

  it('pide el motivo con su contador y muestra el número enmascarado', () => {
    const salida = html({ destino: 'Inactiva', etiqueta: 'Inactivar' })
    expect(salida).toContain('Inactivar · 5412 **** **** 0007')
    expect(salida).toContain('id="estado-motivo"')
    expect(salida).toContain('0/500')
    expect(salida).not.toContain('no se puede deshacer')
  })

  it('al bloquear pide la causa y un detalle opcional', () => {
    const salida = html({ destino: 'Bloqueada', etiqueta: 'Bloquear' })
    expect(salida).toContain('Causa del bloqueo')
    expect(salida).toContain('Detalle (opcional)')
    expect(salida).not.toContain('id="estado-motivo"')
  })

  it('avisa que cancelar, anular o cerrar no se puede deshacer', () => {
    expect(html({ destino: 'Cancelada', etiqueta: 'Cancelar tarjeta' })).toContain('no se puede deshacer')
    expect(html({ destino: 'Cerrada', etiqueta: 'Cerrar' })).toContain('no se puede deshacer')
  })
})
