import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { ListaActivacion } from '@/features/organizacion/components/ListaActivacion'

vi.mock('@/features/organizacion/hooks/useProductosAdmin', () => ({
  useListaActivacion: () => ({
    isPending: false,
    isError: false,
    data: {
      completa: false,
      puntos: [
        { codigo: 'CONDICIONES', descripcion: 'Condiciones vigentes o programadas', cumple: true, detalle: null },
        { codigo: 'NUMERACION', descripcion: 'Regla de numeración de cuentas', cumple: false, detalle: null },
        { codigo: 'PLANTILLAS', descripcion: 'Plantillas de asiento de sus operaciones', cumple: null, detalle: 'Se verifica cuando E4-01 defina las operaciones.' },
      ],
    },
  }),
}))
vi.mock('@/shared/ui', () => ({
  Aviso: ({ children }: ComponentProps<'div'>) => <div>{children}</div>,
  Cargando: ({ texto }: { texto: string }) => <div>{texto}</div>,
}))

describe('ListaActivacion', () => {
  it('marca lo que cumple, lo que falta y lo que aún no se verifica', () => {
    const salida = renderToStaticMarkup(<ListaActivacion idSubProducto={19} />)
    expect(salida).toContain('no se puede activar')
    expect(salida).toContain('aria-label="Cumple"')
    expect(salida).toContain('aria-label="Falta"')
    expect(salida).toContain('aria-label="Pendiente"')
    expect(salida).toContain('E4-01')
  })
})
