import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ refresh: vi.fn() }))
vi.mock('@/features/auth/api/auth.api', () => ({ ...api, getMe: vi.fn(), logout: vi.fn() }))

import { iniciarControlInactividad, seguirConectado, useInactividad } from '@/features/auth/inactividad'
import { useAuthStore } from '@/features/auth/store/auth.store'

const MIN = 60_000

describe('control de inactividad', () => {
  let detener: () => void
  const alExpirar = vi.fn()
  const interactuar = () => document.dispatchEvent(new Event('pointerdown'))

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.stubGlobal('window', new EventTarget())
    vi.stubGlobal('document', Object.assign(new EventTarget(), { visibilityState: 'visible' }))
    api.refresh.mockResolvedValue(undefined)
    detener = iniciarControlInactividad(alExpirar)
  })
  afterEach(() => {
    detener()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('sin interacción no hace peticiones: avisa y luego cierra, nunca después que WorkOS', async () => {
    // Al empezar se supone que la última renovación fue hace 5 min (un access token)
    await vi.advanceTimersByTimeAsync(8 * MIN)
    expect(useInactividad.getState().venceEn).not.toBeNull()
    expect(alExpirar).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(2 * MIN)
    expect(alExpirar).toHaveBeenCalledOnce()
    expect(useInactividad.getState().venceEn).toBeNull()
    expect(api.refresh).not.toHaveBeenCalled()
  })

  it('la interacción renueva la sesión como mucho cada 2 minutos y aplaza el aviso', async () => {
    interactuar()
    await vi.advanceTimersByTimeAsync(0)
    expect(api.refresh).toHaveBeenCalledOnce()
    interactuar()
    await vi.advanceTimersByTimeAsync(MIN)
    interactuar()
    expect(api.refresh).toHaveBeenCalledOnce()
    // Aviso a los 13 min desde la renovación
    await vi.advanceTimersByTimeAsync(11 * MIN)
    expect(useInactividad.getState().venceEn).toBeNull()
    await vi.advanceTimersByTimeAsync(MIN)
    expect(useInactividad.getState().venceEn).not.toBeNull()
  })

  it('con el aviso visible mover el ratón no basta; «Seguir conectado» renueva y lo oculta', async () => {
    await vi.advanceTimersByTimeAsync(8 * MIN)
    interactuar()
    expect(api.refresh).not.toHaveBeenCalled()
    await seguirConectado()
    expect(api.refresh).toHaveBeenCalledOnce()
    expect(useInactividad.getState()).toMatchObject({ venceEn: null, renovando: false, fallo: false })
    await vi.advanceTimersByTimeAsync(5 * MIN)
    expect(alExpirar).not.toHaveBeenCalled()
  })

  it('el aviso es sólo un aviso: no cierra la sesión ni toca el estado de la pantalla (E0-07)', async () => {
    useAuthStore.getState().setSession({
      idUsuario: 'user_demo', nombre: 'Operador demo', email: 'operador@example.invalid',
      idOrganizacion: 'org_demo', roles: ['ADMIN'], permisos: [], idAgencia: '001',
    })
    const antes = useAuthStore.getState()
    await vi.advanceTimersByTimeAsync(8 * MIN)
    expect(useInactividad.getState().venceEn).not.toBeNull()
    // Se muestra el diálogo, pero la sesión, el usuario y la caché siguen intactos
    expect(useAuthStore.getState()).toBe(antes)
    expect(useAuthStore.getState().status).toBe('authenticated')
    expect(alExpirar).not.toHaveBeenCalled()
    await seguirConectado()
    expect(useAuthStore.getState()).toBe(antes)
  })

  it('si la renovación falla por red, el aviso sigue y lo indica', async () => {
    await vi.advanceTimersByTimeAsync(8 * MIN)
    api.refresh.mockRejectedValue(new Error('sin red'))
    await seguirConectado()
    expect(useInactividad.getState().fallo).toBe(true)
    expect(useInactividad.getState().venceEn).not.toBeNull()
  })

  it('al volver a una pestaña con los temporizadores frenados revisa de inmediato', () => {
    vi.setSystemTime(Date.now() + 20 * MIN)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(alExpirar).toHaveBeenCalledOnce()
  })
})
