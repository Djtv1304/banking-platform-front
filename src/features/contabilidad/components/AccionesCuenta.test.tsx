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
    const salida = html(nodo('210140'))
    expect(deshabilitados(salida)).toBe(3)
    expect(salida).toContain('catálogo del regulador')
    expect(salida).toContain('aria-describedby="accion-nombre-motivo"')
  })

  it('una cuenta de 6 dígitos sin saldo deja crear subcuentas', () => {
    const salida = html(nodo('210140'))
    expect(salida).not.toContain('accion-subcuenta-motivo')
  })

  it('una cuenta de 8 dígitos no recibe subcuentas y dice bajo cuál crearla; lo demás sigue disponible', () => {
    const salida = html(nodo('21014001'))
    expect(deshabilitados(salida)).toBe(1)
    expect(salida).toContain('aria-describedby="accion-subcuenta-motivo"')
    expect(salida).toContain('créala bajo 210140.')
  })

  it('bajo una cuenta de 4 dígitos sigue bloqueado por el catálogo del regulador', () => {
    const salida = html(nodo('2101'))
    expect(salida).toContain('aria-describedby="accion-subcuenta-motivo"')
    expect(salida).toContain('Debajo de este nivel solo van cuentas del catálogo del regulador')
  })

  it('una cuenta de 6 dígitos con saldo no deja crear subcuentas ni cambiar nada', () => {
    const salida = html(nodo('210135', 50))
    expect(deshabilitados(salida)).toBe(4)
    expect(salida).toContain('no se divide en subcuentas')
  })
})
