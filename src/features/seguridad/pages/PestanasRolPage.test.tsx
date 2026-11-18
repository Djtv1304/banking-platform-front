import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PestanasRolPage } from '@/features/seguridad/pages/PestanasRolPage'

const estado = vi.hoisted(() => ({
  roles: ['ADMIN'] as string[],
  guardadas: [] as { pestana: string; roles: string[] }[],
}))
vi.mock('@/shared/theme', () => ({ useThemeStore: vi.fn() }))
vi.mock('@/features/auth', async (original) => ({
  ...(await original<typeof import('@/features/auth')>()),
  useAuthStore: (selector: (s: { user: { roles: string[] } }) => unknown) => selector({ user: { roles: estado.roles } }),
}))
vi.mock('@/features/seguridad/hooks/useSeguridad', () => ({
  usePestanas: () => ({ data: estado.guardadas, error: null, isPending: false }),
  useGuardarPestanas: () => ({ isPending: false, error: null, mutate: vi.fn() }),
}))

const pestanas = [
  { to: '/catalogos', label: 'Catálogos', seccion: 'Productos y Catálogos', rolesPorDefecto: ['ADMIN', 'ASESOR'], requiereAccion: false },
  { to: '/cuentas/abrir', label: 'Abrir cuenta', seccion: 'Cuentas', rolesPorDefecto: ['ADMIN', 'ASESOR'], requiereAccion: true },
]
const html = () => renderToStaticMarkup(<PestanasRolPage pestanas={pestanas} roles={['ADMIN', 'ASESOR', 'CAJERO']} />)
beforeEach(() => {
  estado.roles = ['ADMIN']
  estado.guardadas = []
})

describe('Pestañas por rol', () => {
  it('muestra la matriz con los roles por defecto marcados', () => {
    const salida = html()
    expect(salida).toContain('Pestañas por rol')
    expect(salida).toContain('Requiere acción')
    expect(salida.match(/aria-checked="true"/g)).toHaveLength(4)
    expect(salida).not.toContain('Personalizada')
  })

  it('la configuración guardada reemplaza al valor por defecto', () => {
    estado.guardadas = [{ pestana: '/catalogos', roles: ['CAJERO'] }]
    const salida = html()
    expect(salida).toContain('Personalizada')
    expect(salida.match(/aria-checked="true"/g)).toHaveLength(3)
  })

  it.each(['SUPERVISOR', 'ASESOR'])('no la muestra a %s', (rol) => {
    estado.roles = [rol]
    expect(html()).toContain('Solo un administrador')
  })
})
