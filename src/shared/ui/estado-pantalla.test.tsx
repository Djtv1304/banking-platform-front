import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/shared/api'
import { EstadoPantalla } from '@/shared/ui/estado-pantalla'

const html = (props: Parameters<typeof EstadoPantalla>[0]) => renderToStaticMarkup(<EstadoPantalla {...props} />)

describe('EstadoPantalla', () => {
  it('cargando: role status, aria-live polite y texto', () => {
    const salida = html({ estado: 'cargando' })
    expect(salida).toContain('role="status"')
    expect(salida).toContain('aria-live="polite"')
    expect(salida).toContain('Cargando información…')
    expect(salida).toContain('<svg')
  })

  it('vacío: título, descripción por defecto, icono y acción', () => {
    const salida = html({ estado: 'vacio', accion: <button type="button">Crear cuenta</button> })
    expect(salida).toContain('No hay nada para mostrar')
    expect(salida).toContain('Cuando haya información')
    expect(salida).toContain('Crear cuenta')
    expect(salida).toContain('<svg')
    expect(salida).not.toContain('role="status"')
  })

  it('sin permiso: texto propio y el título se puede sustituir', () => {
    expect(html({ estado: 'sin-permiso' })).toContain('No tienes acceso a esta sección')
    expect(html({ estado: 'sin-permiso', titulo: 'Sólo para cajeros' })).toContain('Sólo para cajeros')
  })

  it('error: role alert, mensaje para personas y código de soporte, nunca la traza', () => {
    const error = new ApiError('No pudimos cargar los clientes.', 500, 'error_interno', [], '3a31454c-da47-4d91-86c2-f42ba73d02e4')
    error.stack = 'Error: boom\n    at consultar (/src/features/clientes/api.ts:10:5)'
    const salida = html({ estado: 'error', error, reintentar: vi.fn() })
    expect(salida).toContain('role="alert"')
    expect(salida).toContain('No pudimos cargar los clientes.')
    expect(salida).toContain('Código de soporte')
    expect(salida).toContain('3a31454c-da47-4d91-86c2-f42ba73d02e4')
    expect(salida).toContain('Reintentar')
    expect(salida).not.toContain('at consultar')
    expect(salida).not.toContain('stack')
  })

  it('error sin detalle: mensaje genérico y sin botón de reintento', () => {
    const salida = html({ estado: 'error' })
    expect(salida).toContain('role="alert"')
    expect(salida).toContain('Ocurrió un error inesperado')
    expect(salida).not.toContain('Reintentar')
  })
})
