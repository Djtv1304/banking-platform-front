import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { Tarjeta } from '@/features/tarjetas/api/tarjetas.contract'
import { AccionesTarjeta } from '@/features/tarjetas/components/AccionesTarjeta'

vi.mock('@/shared/ui', () => ({
  Button: ({ children, ...props }: ComponentProps<'button'>) => <button {...props}>{children}</button>,
  Aviso: ({ children }: ComponentProps<'div'>) => <div>{children}</div>,
}))
vi.mock('@/features/tarjetas/components/CambiarEstadoTarjetaDialog', () => ({ CambiarEstadoTarjetaDialog: () => null }))

const tarjeta = (cambios: Partial<Tarjeta> = {}): Tarjeta => ({
  idTarjeta: 7,
  idCuenta: 12,
  idCliente: 3,
  idProducto: 5,
  tipoTarjeta: 'Debito',
  nombreTarjeta: 'ANA PEREZ',
  numeroEnmascarado: '5412 **** **** 0007',
  estadoActual: 'Activa',
  fechaEmision: '2026-11-08',
  esExtension: false,
  idTarjetaTitular: null,
  pinAsignado: true,
  fechaSolicitud: '2026-11-08',
  fechaResolucion: null,
  fechaExpiracion: '2031-11-30',
  ...cambios,
})

const TODOS = { estado: true, pin: true, sobrePin: true, historial: true }
const html = (t: Tarjeta, permisos = TODOS) => renderToStaticMarkup(<AccionesTarjeta tarjeta={t} permisos={permisos} />)

describe('AccionesTarjeta', () => {
  it('una tarjeta Activa ofrece bloquear, inactivar, cancelar, vencer y cerrar', () => {
    const salida = html(tarjeta())
    for (const etiqueta of ['Bloquear', 'Inactivar', 'Cancelar tarjeta', 'Marcar como vencida', 'Cerrar']) {
      expect(salida).toContain(`>${etiqueta}</button>`)
    }
  })

  it('una Generada solo se anula y explica que se activa sola', () => {
    const salida = html(tarjeta({ estadoActual: 'Generada' }))
    expect(salida.match(/<button/g)).toHaveLength(1)
    expect(salida).toContain('>Anular</button>')
    expect(salida).toContain('La activación es automática')
  })

  it('una terminal no ofrece cambios', () => {
    const salida = html(tarjeta({ estadoActual: 'Cancelada' }))
    expect(salida).not.toContain('<button')
    expect(salida).toContain('ya no admite cambios de estado')
  })

  it('sin el permiso tarjetas:estado no se muestra la sección', () => {
    expect(html(tarjeta(), { ...TODOS, estado: false })).toBe('')
  })
})
