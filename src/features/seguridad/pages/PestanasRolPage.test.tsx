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
vi.mock('@/features/seguridad/hooks/useConfiguracionAccesos', () => ({
  useConfiguracionAccesos: () => ({ data: { version: 'a'.repeat(64), activa: true, pestanas: estado.guardadas, secciones: pestanas.map((p) => ({ ruta: p.to, nombre: p.label, roles: p.rolesPorDefecto })) }, error: null, isPending: false, isFetching: false, refetch: vi.fn() }),
  useGuardarConfiguracionAccesos: () => ({ isPending: false, error: null, mutate: vi.fn() }),
}))

const pestanas = [
  { to: '/catalogos', label: 'Catálogos', seccion: 'Productos y Catálogos', rolesPorDefecto: ['ADMIN', 'ASESOR'], requiereAccion: false },
  { to: '/cuentas/abrir', label: 'Abrir cuenta', seccion: 'Cuentas', rolesPorDefecto: ['ADMIN', 'ASESOR'], requiereAccion: true },
  { to: '/cuentas', label: 'Consultar cuentas', seccion: 'Cuentas', rolesPorDefecto: ['ADMIN', 'ASESOR', 'CAJERO'], requiereAccion: false },
]
/** Estado de una casilla por su aria-label: true, false o mixed (grupo parcial) */
const casilla = (salida: string, etiqueta: string) => new RegExp(`aria-checked="([a-z]+)"[^>]*aria-label="${etiqueta}"|aria-label="${etiqueta}"[^>]*aria-checked="([a-z]+)"`).exec(salida)?.slice(1).find(Boolean)
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
    expect(casilla(salida, 'Abrir cuenta: Asesor')).toBe('true')
    expect(casilla(salida, 'Abrir cuenta: Cajero')).toBe('false')
    expect(salida).not.toContain('Personalizada')
    expect(salida).not.toContain('org-') // nombres internos de WorkOS no se muestran
  })

  it('la configuración guardada reemplaza al valor por defecto', () => {
    estado.guardadas = [{ pestana: '/catalogos', roles: ['CAJERO'] }]
    const salida = html()
    expect(salida).toContain('Personalizada')
    expect(casilla(salida, 'Catálogos: Cajero')).toBe('true')
    expect(casilla(salida, 'Catálogos: Asesor')).toBe('false')
  })

  it('la casilla del grupo de módulos refleja sus pestañas: todas, ninguna o parcial', () => {
    const salida = html()
    expect(casilla(salida, 'Grupo Cuentas: Administrador')).toBe('true')
    expect(casilla(salida, 'Grupo Cuentas: Cajero')).toBe('mixed')
    expect(casilla(salida, 'Grupo Productos y Catálogos: Cajero')).toBe('false')
  })

  it.each(['SUPERVISOR', 'ASESOR'])('no la muestra a %s', (rol) => {
    estado.roles = [rol]
    expect(html()).toContain('Solo un administrador')
  })
})
