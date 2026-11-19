import type { ComponentProps, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { NuevaSubcuentaDialog } from '@/features/contabilidad/components/NuevaSubcuentaDialog'
import type { NodoCuenta } from '@/features/contabilidad/lib/arbol'

vi.mock('@/shared/ui', () => ({
  Aviso: ({ tono = 'info', children }: { tono?: string; children: ReactNode }) => <div data-tono={tono}>{children}</div>,
  Button: ({ children, ...props }: ComponentProps<'button'>) => <button {...props}>{children}</button>,
  Checkbox: () => <input type="checkbox" />,
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  Input: (props: ComponentProps<'input'>) => <input {...props} />,
  Label: ({ children, ...props }: ComponentProps<'label'>) => <label {...props}>{children}</label>,
}))

vi.mock('@/features/contabilidad/hooks/useMantenimientoCuentas', () => ({
  useCrearCuenta: () => ({ mutate: vi.fn(), isPending: false }),
}))

const nodo = (esImputable: boolean, hijos: string[] = []): NodoCuenta => {
  const cuenta = (codigoCuenta: string, imputable: boolean) => ({
    idCuentaContable: 1,
    codigoCuenta,
    nombreCuenta: 'Cuenta',
    naturaleza: 'ACREEDORA',
    tipoCuenta: 'PASIVO',
    idCuentaSuperior: null,
    esImputable: imputable,
    saldo: 0,
    estado: 'Activo',
  })
  return {
    cuenta: cuenta('210140', esImputable),
    nivel: 3,
    idPadre: null,
    hijos: hijos.map((codigo) => ({ cuenta: cuenta(codigo, true), nivel: 4, idPadre: 1, hijos: [] })),
  }
}

const html = (padre: NodoCuenta) => renderToStaticMarkup(<NuevaSubcuentaDialog padre={padre} onCerrar={vi.fn()} onHecho={vi.fn()} />)

describe('NuevaSubcuentaDialog', () => {
  it('propone un código de 8 dígitos', () => {
    const salida = html(nodo(false, ['21014001']))
    expect(salida).toContain('maxLength="8"')
    expect(salida).toContain('Siguiente libre: 21014002.')
  })

  it('si la cuenta superior es imputable, avisa que dejará de recibir movimientos sin tono de error', () => {
    const salida = html(nodo(true))
    expect(salida).toContain('data-tono="info"')
    expect(salida).toContain('La cuenta 210140 dejará de recibir movimientos: los recibirán sus subcuentas.')
  })

  it('si la cuenta superior no es imputable, no muestra ese aviso', () => {
    expect(html(nodo(false))).not.toContain('dejará de recibir movimientos')
  })
})
