import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/shared/api'
import { RegistroClienteWizard, type RegistroClienteWizardProps } from '@/features/clientes/components/RegistroClienteWizard'
import { BOTON_SOLICITAR_REINCORPORACION, MENSAJE_CLIENTE_ELIMINADO } from '@/features/clientes/lib/reincorporacion'
vi.mock('@/shared/theme', () => ({ useThemeStore: vi.fn() }))

function renderWizard(props: RegistroClienteWizardProps = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const router = createMemoryRouter([{ path: '/', element: <RegistroClienteWizard {...props} /> }])
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('RegistroClienteWizard · aviso y botón de reincorporación', () => {
  it('si el alta devuelve CLIENTE_ELIMINADO muestra el aviso y el botón de reincorporación en vez del error', () => {
    const html = renderWizard({
      initialError: new ApiError('Cliente eliminado', 409, 'CLIENTE_ELIMINADO'),
    })

    expect(html).toContain(MENSAJE_CLIENTE_ELIMINADO)
    expect(html).toContain(BOTON_SOLICITAR_REINCORPORACION)
    expect(html).not.toContain('Consultar clientes')
  })

  it('tras el 202 muestra AvisoRequiereAprobacion con el idSolicitud y no navega a la ficha', () => {
    const html = renderWizard({
      initialError: new ApiError('Cliente eliminado', 409, 'CLIENTE_ELIMINADO'),
      initialIdSolicitud: 789,
    })

    expect(html).toContain('Solicitud #789 pendiente de aprobación')
    expect(html).toContain('/aprobaciones/789')
    expect(html).not.toContain(BOTON_SOLICITAR_REINCORPORACION)
    expect(html).not.toContain('Cliente registrado')
    expect(html).not.toContain('Ver cliente registrado')
  })

  it.each([
    ['CLIENTE_DUPLICADO', 'Ya existe un cliente con esa identificación'],
    ['DOCUMENTO_INVALIDO', 'El backend rechazó el documento'],
  ])('para otro tipo de error (%s) muestra el aviso de error común con enlace a búsqueda', (code, textoEsperado) => {
    const html = renderWizard({
      initialError: new ApiError('Conflicto', 409, code),
    })

    expect(html).toContain(textoEsperado)
    expect(html).toContain('Consultar clientes')
    expect(html).not.toContain(BOTON_SOLICITAR_REINCORPORACION)
  })
})
