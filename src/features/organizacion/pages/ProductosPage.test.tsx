import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'

import { ProductosPage } from '@/features/organizacion/pages/ProductosPage'
import type { ProductoAdmin } from '@/features/organizacion/api/productos.contract'

const estado = vi.hoisted(() => ({ roles: ['ADMIN'] as string[], data: [] as unknown[] }))
vi.mock('@/features/auth', () => ({
  useAuthStore: (selector: (s: { user: { roles: string[] } }) => unknown) => selector({ user: { roles: estado.roles } }),
  hasAnyRole: (roles: readonly string[], permitidos: readonly string[]) => roles.some((r) => permitidos.includes(r)),
}))
vi.mock('@/features/organizacion/hooks/useProductosAdmin', () => ({
  useProductosAdmin: () => ({ data: estado.data, isPending: false, isError: false, error: null }),
  useActualizarProducto: () => ({ isPending: false, mutate: vi.fn() }),
  useActualizarSubProducto: () => ({ isPending: false, mutate: vi.fn() }),
}))
vi.mock('@/features/organizacion/components/ProductoFormDialog', () => ({ ProductoFormDialog: () => null }))
vi.mock('@/features/organizacion/components/SubProductoFormDialog', () => ({ SubProductoFormDialog: () => null }))
vi.mock('@/shared/ui', () => ({
  Button: ({ children, ...props }: ComponentProps<'button'>) => <button {...props}>{children}</button>,
  Badge: ({ children }: ComponentProps<'span'>) => <span>{children}</span>,
  Aviso: ({ children }: ComponentProps<'div'>) => <div>{children}</div>,
  Cargando: ({ texto }: { texto: string }) => <div>{texto}</div>,
}))

const AHORRO: ProductoAdmin = {
  idProducto: 1,
  codigoProducto: 'AHO001',
  nombreProducto: 'Ahorro a la vista',
  descripcion: 'Cuenta de ahorro con retiros libres',
  tipoProducto: 'Cuenta',
  tipoCuenta: 'Ahorro',
  montoAperturaMinimo: 20,
  idTipoCredito: null,
  nombreTipoCredito: null,
  idRed: null,
  nombreRed: null,
  permiteOperacionesPresenciales: true,
  estado: 'A',
  subproductos: [
    { idSubProducto: 1, idProducto: 1, codigoSubProducto: 'AHO001-PN', nombreSubProducto: 'Persona natural', estado: 'A', fechaRegistro: '2026-11-15T10:00:00', tipoTarjeta: null },
  ],
}

beforeEach(() => {
  estado.roles = ['ADMIN']
  estado.data = [AHORRO]
})
const html = () => renderToStaticMarkup(<ProductosPage />)

describe('ProductosPage', () => {
  it('muestra productos, descripción y subproductos', () => {
    const salida = html()
    expect(salida).toContain('Ahorro a la vista')
    expect(salida).toContain('Cuenta de ahorro con retiros libres')
    expect(salida).toContain('AHO001-PN')
  })

  it('ADMIN ve las acciones de crear, editar y cambiar estado', () => {
    const salida = html()
    expect(salida).toContain('Nuevo producto')
    expect(salida).toContain('aria-label="Editar AHO001"')
    expect(salida).toContain('aria-label="Desactivar AHO001"')
    expect(salida).toContain('aria-label="Agregar subproducto a AHO001"')
  })

  it('ASESOR solo consulta: no hay ninguna acción', () => {
    estado.roles = ['ASESOR']
    const salida = html()
    expect(salida).toContain('Ahorro a la vista')
    expect(salida).toContain('Solo consulta')
    expect(salida).not.toContain('Nuevo producto')
    expect(salida).not.toContain('Editar')
    expect(salida).not.toContain('Desactivar')
    expect(salida).not.toContain('Subproducto</button>')
  })

  it('en la app solo se habla de clientes, nunca de socios', () => {
    expect(html().toLowerCase()).not.toContain('socio')
  })
})
