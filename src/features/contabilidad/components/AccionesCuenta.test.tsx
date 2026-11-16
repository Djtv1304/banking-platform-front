import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { AccionesCuenta } from '@/features/contabilidad/components/AccionesCuenta'
import type { NodoCuenta } from '@/features/contabilidad/lib/arbol'

vi.mock('@/shared/ui', () => ({
  Button: ({ children, ...props }: ComponentProps<'button'>) => <button {...props}>{children}</button>,
}))

const nodo = (codigoCuenta: string, saldo = 0): NodoCuenta => ({
  cuenta: {
    idCuentaContable: 1,
    codigoCuenta,
    nombreCuenta: 'Cuenta',
    naturaleza: 'ACREEDORA',
    tipoCuenta: 'PASIVO',
    idCuentaSuperior: null,
    esImputable: true,
    saldo,
    estado: 'Activo',
  },
  nivel: 3,
  idPadre: null,
  hijos: [],
})

const html = (n: NodoCuenta) => renderToStaticMarkup(<AccionesCuenta nodo={n} onAccion={vi.fn()} />)
const deshabilitados = (salida: string) => salida.match(/disabled=""/g)?.length ?? 0

describe('AccionesCuenta', () => {
  it('en un nivel del regulador solo deja crear subcuentas y explica el motivo', () => {
    const salida = html(nodo('2101'))
    expect(deshabilitados(salida)).toBe(3)
    expect(salida).toContain('catálogo del regulador')
    expect(salida).toContain('aria-describedby="accion-nombre-motivo"')
  })

  it('una cuenta propia sin saldo tiene todas las acciones', () => {
    expect(deshabilitados(html(nodo('21014001')))).toBe(0)
  })

  it('con saldo no deja desactivar ni eliminar', () => {
    const salida = html(nodo('21014001', 50))
    expect(deshabilitados(salida)).toBe(2)
    expect(salida).toContain('saldo distinto de cero')
  })
})
