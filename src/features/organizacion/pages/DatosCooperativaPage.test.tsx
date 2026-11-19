import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { ApiError } from '@/shared/api'
import { DatosCooperativaPage } from '@/features/organizacion/pages/DatosCooperativaPage'

const estado = vi.hoisted(() => ({ roles: ['ADMIN'], data: undefined as unknown, error: null as unknown, pendiente: false }))
vi.mock('@/features/auth', () => ({
    usePuedeFuncion: (_funcion: string, anterior: boolean) => anterior,
  useAuthStore: () => estado.roles,
  usePermisos: () => (estado.roles.includes('ADMIN') ? ['organizacionEditar'] : []),
}))
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ cancelQueries: vi.fn() }) }))
vi.mock('@/features/organizacion/hooks/useEntidad', () => ({
  useEntidad: () => ({ data: estado.data, error: estado.error, isPending: estado.pendiente, isError: !!estado.error, isSuccess: !!estado.data && !estado.error, isFetching: false, refetch: vi.fn() }),
  useActualizarEntidad: () => ({ isPending: false, error: null, reset: vi.fn(), mutateAsync: vi.fn() }),
}))
vi.mock('@/features/organizacion/hooks/useCrearEntidad', () => ({ useCrearEntidad: () => ({ registrar: vi.fn(), pendiente: false, error: null, reset: vi.fn() }) }))
vi.mock('@/features/organizacion/components/EntidadForm', () => ({ EntidadForm: () => null }))
vi.mock('@/shared/ui', () => ({
  Button: ({ children, ...props }: ComponentProps<'button'>) => <button {...props}>{children}</button>,
  Badge: ({ children }: ComponentProps<'span'>) => <span>{children}</span>,
}))

beforeEach(() => { estado.roles = ['ADMIN']; estado.data = undefined; estado.error = null; estado.pendiente = false })
const html = () => renderToStaticMarkup(<DatosCooperativaPage />)

describe('Visibilidad de la creación inicial', () => {
  it('ofrece crear solo cuando GET confirma ausencia y el perfil es ADMIN', () => {
    estado.error = new ApiError('Sin entidad', 404, 'ENTIDAD_NO_ENCONTRADA')
    expect(html()).toContain('Crear cooperativa</button>')
    estado.roles = ['ASESOR']
    expect(html()).not.toContain('Crear cooperativa</button>')
    expect(html()).toContain('Solicita a un administrador')
  })

  it.each(['A', 'I'])('no ofrece crear si GET devuelve una entidad en estado %s', codigo => {
    estado.data = { idEntidad: 1, ruc: '1790000000001', razonSocial: 'Cooperativa Ficticia Enquo', estado: codigo, fechaConstitucion: '2000-01-15', fechaRegistro: '2026-11-12T12:00:00', modificadoPor: 1 }
    expect(html()).not.toContain('Crear cooperativa</button>')
    expect(html()).toContain('Editar datos')
  })

  it('no ofrece crear durante la carga', () => {
    estado.pendiente = true
    expect(html()).toContain('Cargando datos')
    expect(html()).not.toContain('Crear cooperativa</button>')
  })

  it.each([[404, 'OTRO_404'], [401, 'NO_AUTENTICADO'], [403, 'SIN_PERMISO'], [500, 'ERROR'], [null, 'network_error']] as const)('no interpreta el error %s como ausencia', (status, code) => {
    estado.error = new ApiError('Error de prueba', status, code)
    expect(html()).not.toContain('Crear cooperativa</button>')
    expect(html()).toContain('Reintentar')
  })
})
