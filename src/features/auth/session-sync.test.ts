import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ getMe: vi.fn(), refresh: vi.fn() }))
vi.mock('@/features/auth/api/auth.api', () => ({ ...api, logout: vi.fn() }))

import { apiClient, ApiError } from '@/shared/api'
import { registerAuthHandlers, refreshSession, startSessionSync } from '@/features/auth/session'
import { useAuthStore } from '@/features/auth/store/auth.store'
import type { MeResponse } from '@/features/auth/api/auth.contract'

const perfil: MeResponse = {
  idUsuario: 'user_demo', nombre: 'Operador demo', email: 'operador@example.invalid',
  idOrganizacion: 'org_demo', roles: ['ADMIN'], permisos: [], idAgencia: '001',
}

describe('sincronización del acceso de la sesión', () => {
  const cache = { clear: vi.fn() }
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.getState().setSession(perfil)
    registerAuthHandlers(cache)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('actualiza al volver con actividad, sin sondeos peri�dicos', async () => {
    vi.useFakeTimers()
    const ventana = new EventTarget()
    vi.stubGlobal('window', ventana)
    vi.stubGlobal('document', Object.assign(new EventTarget(), { visibilityState: 'visible' }))
    api.getMe.mockResolvedValue(perfil)
    const detener = startSessionSync()
    try {
      ventana.dispatchEvent(new Event('focus'))
      document.dispatchEvent(new Event('visibilitychange'))
      await vi.advanceTimersByTimeAsync(5 * 60_000)
      expect(api.getMe).toHaveBeenCalledOnce()
      expect(api.refresh).not.toHaveBeenCalled()
    } finally { detener() }
  })

  it('un cierre en otra pestaña cierra esta con el mismo motivo', async () => {
    vi.stubGlobal('window', new EventTarget())
    vi.stubGlobal('document', Object.assign(new EventTarget(), { visibilityState: 'visible' }))
    const detener = startSessionSync()
    const otraPestana = new BroadcastChannel('enquocoop-sesion')
    try {
      otraPestana.postMessage({ tipo: 'cerrada', motivo: 'SESION_REVOCADA' })
      await vi.waitFor(() => expect(useAuthStore.getState().status).toBe('anonymous'))
      expect(useAuthStore.getState().motivoCierre).toBe('SESION_REVOCADA')
      expect(cache.clear).toHaveBeenCalledOnce()
    } finally {
      otraPestana.close()
      detener()
    }
  })

  it('ante un 403 sincroniza el menú sin repetir la operación rechazada', async () => {
    api.getMe.mockResolvedValue({ ...perfil, roles: ['ASESOR'] })
    const adapter = vi.fn().mockRejectedValue({ isAxiosError: true, response: { status: 403, data: {} }, config: { url: '/api/v1/usuarios' } })
    await expect(apiClient.get('/api/v1/usuarios', { adapter })).rejects.toMatchObject({ status: 403 })
    expect(adapter).toHaveBeenCalledOnce()
    expect(api.getMe).toHaveBeenCalledOnce()
    expect(useAuthStore.getState().user?.roles).toEqual(['ASESOR'])
  })

  it('agrupa lecturas simultáneas y conserva la caché si el acceso no cambió', async () => {
    api.getMe.mockResolvedValue({ ...perfil, nombre: 'Nombre actualizado' })
    await Promise.all([refreshSession(), refreshSession()])
    expect(api.getMe).toHaveBeenCalledOnce()
    expect(cache.clear).not.toHaveBeenCalled()
    expect(useAuthStore.getState().user?.nombre).toBe('Nombre actualizado')
  })

  it('conserva la sesión ante un 503 y no confunde un fallo temporal con logout', async () => {
    api.getMe.mockRejectedValue(new ApiError('Temporal', 503, 'http_503'))
    await refreshSession()
    expect(useAuthStore.getState().user).toEqual(perfil)
    expect(cache.clear).not.toHaveBeenCalled()
  })

  it.each([
    { idAgencia: '002' },
    { permisos: ['clientes:consultar'] },
  ])('limpia la caché al cambiar el alcance o los permisos: %j', async (cambios) => {
    api.getMe.mockResolvedValue({ ...perfil, ...cambios })
    await refreshSession()
    expect(cache.clear).toHaveBeenCalledOnce()
  })

  it('cierra la sesión si /me confirma que el usuario ya no puede acceder', async () => {
    api.getMe.mockRejectedValue(new ApiError('Usuario inactivo', 403, 'USUARIO_NO_REGISTRADO'))
    await refreshSession()
    expect(useAuthStore.getState().status).toBe('anonymous')
    expect(cache.clear).toHaveBeenCalledOnce()
  })

  it('no consulta /me si no hay sesión iniciada', async () => {
    useAuthStore.getState().clearSession()
    await refreshSession()
    expect(api.getMe).not.toHaveBeenCalled()
  })

  it('una respuesta antigua no restaura la sesión después de cerrarla', async () => {
    let resolver!: (perfil: MeResponse) => void
    api.getMe.mockReturnValue(new Promise<MeResponse>((resolve) => { resolver = resolve }))
    const pendiente = refreshSession()
    useAuthStore.getState().clearSession()
    resolver(perfil)
    await pendiente
    expect(useAuthStore.getState().status).toBe('anonymous')
  })

  it('no entra en un bucle si /auth/me también devuelve 403', async () => {
    const adapter = vi.fn().mockRejectedValue({ isAxiosError: true, response: { status: 403, data: {} }, config: { url: '/api/v1/auth/me' } })
    await expect(apiClient.get('/api/v1/auth/me', { adapter })).rejects.toMatchObject({ status: 403 })
    expect(api.getMe).not.toHaveBeenCalled()
  })
})
