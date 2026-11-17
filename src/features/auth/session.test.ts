import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ApiError } from '@/shared/api'

const captured = vi.hoisted(() => ({ handler: null as ((error: ApiError) => void) | null }))

vi.mock('@/shared/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  setUnauthorizedHandler: (h: (error: ApiError) => void) => {
    captured.handler = h
  },
}))

import { ApiError as Error401 } from '@/shared/api'
import { registerAuthHandlers } from '@/features/auth/session'
import { useAuthStore } from '@/features/auth/store/auth.store'
import type { MeResponse } from '@/features/auth/api/auth.contract'

const perfil: MeResponse = {
  idUsuario: 'user_demo', nombre: 'Operador demo', email: 'operador@example.invalid',
  idOrganizacion: 'org_demo', roles: ['ADMIN'], permisos: [], idAgencia: '001',
}
const no401 = (code: string) => new Error401('Sesión terminada', 401, code)

describe('registerAuthHandlers', () => {
  const queryClient = { clear: vi.fn() }
  beforeEach(() => {
    vi.clearAllMocks()
    captured.handler = null
    useAuthStore.getState().setSession(perfil)
    registerAuthHandlers(queryClient)
  })

  it('ante un 401 cierra la sesión local, vacía la caché y guarda el motivo para /login', () => {
    captured.handler?.(no401('SESION_INACTIVA'))
    expect(useAuthStore.getState()).toMatchObject({ status: 'anonymous', user: null, motivoCierre: 'SESION_INACTIVA' })
    expect(queryClient.clear).toHaveBeenCalledOnce()
  })

  it.each(['SESION_EXPIRADA', 'SESION_REVOCADA'])('conserva el motivo %s', (code) => {
    captured.handler?.(no401(code))
    expect(useAuthStore.getState().motivoCierre).toBe(code)
  })

  it('NO_AUTENTICADO es un login normal, sin aviso', () => {
    captured.handler?.(no401('NO_AUTENTICADO'))
    expect(useAuthStore.getState()).toMatchObject({ status: 'anonymous', motivoCierre: null })
  })

  it('un 401 posterior sin cookie (NO_AUTENTICADO) no borra el motivo del primero', () => {
    captured.handler?.(no401('SESION_REVOCADA'))
    captured.handler?.(no401('NO_AUTENTICADO'))
    expect(useAuthStore.getState().motivoCierre).toBe('SESION_REVOCADA')
  })
})
