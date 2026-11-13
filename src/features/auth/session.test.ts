import { beforeEach, describe, expect, it, vi } from 'vitest'

const captured = vi.hoisted(() => ({ handler: null as (() => void) | null }))

vi.mock('@/shared/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  setUnauthorizedHandler: (h: () => void) => {
    captured.handler = h
  },
}))

import { registerAuthHandlers } from '@/features/auth/session'
import { useAuthStore } from '@/features/auth/store/auth.store'

describe('registerAuthHandlers', () => {
  beforeEach(() => {
    captured.handler = null
  })

  it('ante un 401 cierra la sesión local y vacía la caché de consultas', () => {
    const clearSession = vi.spyOn(useAuthStore.getState(), 'clearSession')
    const queryClient = { clear: vi.fn() }

    registerAuthHandlers(queryClient)
    expect(captured.handler).not.toBeNull()
    captured.handler?.()

    expect(clearSession).toHaveBeenCalledOnce()
    expect(queryClient.clear).toHaveBeenCalledOnce()
  })
})
