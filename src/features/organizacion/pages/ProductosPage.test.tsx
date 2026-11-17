import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'

import { DetalleProductoPage } from '@/features/organizacion/pages/DetalleProductoPage'
import { ProductosPage } from '@/features/organizacion/pages/ProductosPage'
import type { ProductoAdmin } from '@/features/organizacion/api/productos.contract'

const estado = vi.hoisted(() => ({ roles: ['ADMIN'] as string[], permisos: ['productos:editar', 'productos:exportar'], data: [] as unknown[] }))
vi.mock('@/features/auth', async () => {
  const { hasPermission, PERMISOS } = await import('@/shared/lib')
  return {
    hasPermission,
    PERMISOS,
    usePermisos: () => (estado.roles.includes('ADMIN') ? estado.permisos : []),
  }
})
vi.mock('react-router', () => ({
  Link: ({ children, to, ...props }: ComponentProps<'a'> & { to: string }) => <a href={to} {...props}>{children}</a>,
  useParams: () => ({ idProducto: '1' }),
  useNavigate: () => vi.fn(),
}))
vi.mock('@/features/organizacion/hooks/useProductosAdmin', () => ({
  useTiposProducto: () => ({ data: [] }),
  useProductosAdmin: () => ({ data: estado.data, isPending: false, isError: false, error: null }),
  useProductoAdmin: () => ({ data: estado.data[0], isPending: false, isError: false, error: null }),
  useActualizarProducto: () => ({ isPending: false, mutate: vi.fn() }),
  useActualizarSubProducto: () => ({ isPending: false, mutate: vi.fn() }),
  useEliminarProducto: () => ({ isPending: false, mutate: vi.fn() }),
}))
vi.mock('@/features/organizacion/components/ProductoFormDialog', () => ({ ProductoFormDialog: () => null }))
vi.mock('@/features/organizacion/components/SubProductoFormDialog', () => ({ SubProductoFormDialog: () => null }))
vi.mock('@/features/organizacion/components/ParametrosSubProductoDialog', () => ({
  ParametrosSubProductoDialog: () => null,
  VinculosProductoDialog: () => null,
}))
vi.mock('@/shared/ui', () => ({
  Button: ({ children, ...props }: ComponentProps<'button'>) => <button {...props}>{children}</button>,
  Badge: ({ children }: ComponentProps<'span'>) => <span>{children}</span>,
  Input: (props: ComponentProps<'input'>) => <input {...props} />,
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

const CONSUMO: ProductoAdmin = {
  ...AHORRO,
  idProducto: 2,
  codigoProducto: 'CRE001',
  nombreProducto: 'Crédito de consumo',
  descripcion: null,
  tipoProducto: 'Credito',
  tipoCuenta: null,
  montoAperturaMinimo: null,
  idTipoCredito: 1,
  nombreTipoCredito: 'Consumo',
  subproductos: [
    { idSubProducto: 5, idProducto: 2, codigoSubProducto: 'CRE001-01', nombreSubProducto: 'Consumo hasta 10000', estado: 'A', fechaRegistro: '2026-11-15T10:00:00', tipoTarjeta: null },
  ],
}

beforeEach(() => {
  estado.roles = ['ADMIN']
  estado.permisos = ['productos:editar', 'productos:exportar']
  estado.data = [AHORRO]
})
const lista = () => renderToStaticMarkup(<ProductosPage />)
const detalle = () => renderToStaticMarkup(<DetalleProductoPage />)

describe('ProductosPage (listado)', () => {
  it('agrupa por tipo y los grupos empiezan cerrados', () => {
    estado.data = [AHORRO, CONSUMO]
    const salida = lista()
    expect(salida).toContain('aria-label="Buscar productos"')
    expect(salida.indexOf('Cuentas')).toBeLessThan(salida.indexOf('Créditos'))
    expect(salida).not.toContain('Tarjetas')
    expect(salida).toContain('aria-expanded="false"')
    expect(salida).not.toContain('href="/productos/1"')
  })

  it('ADMIN crea; ASESOR solo consulta', () => {
    expect(lista()).toContain('Nuevo producto')
    estado.roles = ['ASESOR']
    expect(lista()).toContain('Solo consulta')
    expect(lista()).not.toContain('Nuevo producto')
  })

  it('en la app solo se habla de clientes, nunca de socios', () => {
    expect(lista().toLowerCase()).not.toContain('socio')
  })
})

describe('DetalleProductoPage', () => {
  it('muestra la descripción y los subproductos', () => {
    const salida = detalle()
    expect(salida).toContain('Cuenta de ahorro con retiros libres')
    expect(salida).toContain('AHO001-PN')
  })

  it('ADMIN edita, cambia estado y agrega subproductos', () => {
    const salida = detalle()
    expect(salida).toContain('Editar')
    expect(salida).toContain('aria-label="Desactivar AHO001-PN"')
    expect(salida).toContain('Subproducto</button>')
  })

  it('todos los subproductos se parametrizan, con la ayuda de su tipo', () => {
    expect(detalle()).toContain('aria-label="Parámetros de AHO001-PN"')
    expect(detalle()).toContain('cupos por canal')
    estado.data = [CONSUMO]
    expect(detalle()).toContain('aria-label="Parámetros de CRE001-01"')
    expect(detalle()).toContain('tablas de amortización')
    expect(detalle()).toContain('Tasas y cargos')
  })

  it('ASESOR consulta los parámetros pero no cambia nada', () => {
    estado.roles = ['ASESOR']
    estado.data = [CONSUMO]
    const salida = detalle()
    expect(salida).toContain('Solo consulta')
    expect(salida).toContain('aria-label="Parámetros de CRE001-01"')
    expect(salida).not.toContain('Editar')
    expect(salida).not.toContain('Desactivar')
    expect(salida).not.toContain('Subproducto</button>')
  })
})


it('sin productos:editar no ofrece escrituras aunque el rol sea ADMIN', () => {
  estado.permisos = ['productos:exportar']
  expect(lista()).not.toContain('Nuevo producto')
  expect(detalle()).not.toContain('Editar')
})
it('consultar no pide permiso: sin ninguno, la lista se muestra', () => {
  estado.permisos = []
  expect(lista()).not.toContain('No tienes permiso')
})
it('el producto activo muestra el editor deshabilitado', () => {
  estado.data = [{ ...AHORRO, estadoCatalogo: 'Activo' }]
  expect(detalle()).toMatch(/<button[^>]*disabled[^>]*>[\s\S]*?Editar/)
})
