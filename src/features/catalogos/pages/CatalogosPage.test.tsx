import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'

import { CatalogosPage } from '@/features/catalogos/pages/CatalogosPage'

const estado = vi.hoisted(() => ({ roles: ['ADMIN'] as string[] }))
vi.mock('@/features/auth', async () => {
  const { hasPermission, PERMISOS } = await import('@/shared/lib')
  return {
    hasPermission,
    PERMISOS,
    usePermisos: () => (estado.roles.includes('ADMIN') ? ['catalogosEditar'] : []),
  }
})
vi.mock('react-router', () => ({ useSearchParams: () => [new URLSearchParams(), vi.fn()] }))
vi.mock('@/features/catalogos/hooks/useCatalogos', () => ({
  useCatalogosAdministrables: () => ({
    isPending: false,
    isError: false,
    data: [
      {
        clave: 'tasas-interes',
        nombre: 'Tasas de interés',
        descripcion: 'Tasas',
        permiteCrear: true,
        camposAlta: [],
        permiteEliminar: true,
        campos: [
          { nombre: 'nombreTipoCredito', etiqueta: 'Tipo de crédito', tipo: 'texto', editable: false, nulo: false },
          { nombre: 'tasaNominalAnual', etiqueta: 'Tasa anual', tipo: 'porcentaje', editable: true, nulo: false },
        ],
      },
      { clave: 'paises', nombre: 'Países', descripcion: 'Países', permiteCrear: false, campos: [], camposAlta: [], permiteEliminar: false },
    ],
  }),
  useRegistrosCatalogo: () => ({
    isPending: false,
    isError: false,
    data: [{ id: '1', estado: 'A', nombreTipoCredito: 'Consumo', tasaNominalAnual: 0.16 }],
  }),
  useActualizarRegistroCatalogo: () => ({ isPending: false, mutate: vi.fn() }),
  useEliminarRegistroCatalogo: () => ({ isPending: false, mutate: vi.fn() }),
}))
vi.mock('@/features/catalogos/components/EditarRegistroDialog', () => ({ EditarRegistroDialog: () => null }))
vi.mock('@/features/catalogos/components/NuevaTasaDialog', () => ({ NuevaTasaDialog: () => null }))
vi.mock('@/features/catalogos/components/ConfirmacionDialog', () => ({ ConfirmacionDialog: () => null }))
vi.mock('@/shared/ui', () => ({
  Button: ({ children, ...props }: ComponentProps<'button'>) => <button {...props}>{children}</button>,
  Badge: ({ children }: ComponentProps<'span'>) => <span>{children}</span>,
  Input: (props: ComponentProps<'input'>) => <input {...props} />,
  Aviso: ({ children }: ComponentProps<'div'>) => <div>{children}</div>,
  Cargando: ({ texto }: { texto: string }) => <div>{texto}</div>,
}))

const html = () => renderToStaticMarkup(<CatalogosPage />)

beforeEach(() => {
  estado.roles = ['ADMIN']
})

describe('CatalogosPage', () => {
  it('lista todos los catálogos y abre el primero', () => {
    const salida = html()
    expect(salida).toContain('Países')
    expect(salida).toContain('16 %')
    expect(salida).toContain('Consumo')
  })

  it('ADMIN edita, activa o desactiva y crea tasas', () => {
    const salida = html()
    expect(salida).toContain('aria-label="Editar registro 1"')
    expect(salida).toContain('aria-label="Desactivar registro 1"')
    expect(salida).toContain('Nueva tasa')
    expect(salida).toContain('aria-label="Eliminar registro 1"')
  })

  it('ASESOR solo consulta', () => {
    estado.roles = ['ASESOR']
    const salida = html()
    expect(salida).toContain('Solo consulta')
    expect(salida).toContain('16 %')
    expect(salida).not.toContain('Editar')
    expect(salida).not.toContain('Desactivar')
    expect(salida).not.toContain('Nueva tasa')
    expect(salida).not.toContain('Eliminar')
  })
})
