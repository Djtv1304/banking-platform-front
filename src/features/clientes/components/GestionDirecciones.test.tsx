import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { GestionDirecciones } from '@/features/clientes/components/GestionDirecciones'

vi.mock('@/shared/theme', () => ({ useThemeStore: vi.fn() }))
vi.mock('@/features/catalogos/hooks/useTiposDireccion', () => ({
  useTiposDireccion: () => ({ data: [{ codigo: 'Trabajo', nombre: 'Oficina del cliente', estado: 'A' }] }),
}))

vi.mock('@/features/clientes/hooks/useDirecciones', () => ({
  useDirecciones: () => ({
    consulta: {
      data: [
        { idDireccion: 1, tipoDireccion: 'Domicilio', estado: 'Activo', esPrincipal: true, calleDireccion: 'Casa actual', referenciaUbicacion: 'Parque' },
        { idDireccion: 2, tipoDireccion: 'Trabajo', estado: 'Eliminado', esPrincipal: false, calleDireccion: 'Oficina anterior', referenciaUbicacion: 'Plaza' },
        { idDireccion: 3, tipoDireccion: 'Domicilio', estado: 'Activo', esPrincipal: false, calleDireccion: 'Casa secundaria', referenciaUbicacion: 'Parque' },
      ],
      isPending: false, isError: false, isFetching: false,
    },
    pendiente: false,
  }),
}))

describe('histórico de direcciones', () => {
  it('mantiene visible la retirada y distingue una sola dirección activa', () => {
    const html = renderToStaticMarkup(<GestionDirecciones idCliente={1} soloLectura />)
    expect(html).toContain('2 direcciones activas')
    expect(html).toContain('Direcciones retiradas (1)')
    expect(html).toContain('Oficina anterior')
    expect(html).toContain('Retirada')
    expect(html).toContain('Oficina del cliente')
  })

  it('oculta las acciones y la explicación de eliminación en solo consulta', () => {
    const html = renderToStaticMarkup(<GestionDirecciones idCliente={1} soloLectura />)
    expect(html).not.toContain('Agregar dirección')
    expect(html).not.toContain('>Editar</button>')
    expect(html).not.toContain('Hacer principal')
    expect(html).not.toContain('Eliminar dirección')
    expect(html).not.toContain('Para eliminarla')
    expect(html).not.toContain('El cliente está eliminado')
  })

  it('conserva las acciones cuando el usuario tiene gestión', () => {
    const html = renderToStaticMarkup(<GestionDirecciones idCliente={1} />)
    expect(html).toContain('Agregar dirección')
    expect(html).toContain('>Editar</button>')
    expect(html).toContain('Hacer principal')
    expect(html).toContain('Eliminar dirección')
    expect(html).toContain('Para eliminarla')
  })
})
