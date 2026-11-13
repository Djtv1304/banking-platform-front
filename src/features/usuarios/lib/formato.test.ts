import { describe, expect, it, vi } from 'vitest'

// formato.ts usa formatRol del barrel de auth, que arrastra la sesión del navegador
vi.mock('@/features/auth', () => ({ formatRol: (rol: string) => rol }))

import { etiquetaInvitacion, haceCuanto, invitacionCaducada, leerFecha, tonoEstado } from '@/features/usuarios/lib/formato'

describe('leerFecha', () => {
  it('lee las fechas sin zona y con microsegundos como UTC', () => {
    expect(leerFecha('2026-11-09T04:26:40.093000')?.toISOString()).toBe('2026-11-09T04:26:40.093Z')
  })

  it('respeta la zona cuando viene y rechaza valores inválidos', () => {
    expect(leerFecha('2026-11-13T02:35:00.822Z')?.toISOString()).toBe('2026-11-13T02:35:00.822Z')
    expect(leerFecha('2026-11-13T02:35:00-05:00')?.toISOString()).toBe('2026-11-13T07:35:00.000Z')
    expect(leerFecha('no es fecha')).toBeNull()
  })
})

it('haceCuanto describe el último ingreso en tiempo relativo', () => {
  const ahora = new Date('2026-11-13T00:00:00Z')
  expect(haceCuanto('2026-11-12T21:00:00', ahora)).toBe('hace 3 horas')
  expect(haceCuanto('2026-11-10T00:00:00', ahora)).toBe('hace 3 días')
})

describe('invitación de WorkOS', () => {
  it('traduce los estados conocidos y deja los demás tal cual', () => {
    expect(etiquetaInvitacion('pending')).toBe('Enviada, aún sin aceptar')
    expect(etiquetaInvitacion('accepted')).toBe('Aceptada')
    expect(etiquetaInvitacion('otro')).toBe('otro')
  })

  it('marca como caducadas las vencidas o anuladas', () => {
    expect(invitacionCaducada('expired')).toBe(true)
    expect(invitacionCaducada('revoked')).toBe(true)
    expect(invitacionCaducada('pending')).toBe(false)
    expect(invitacionCaducada(null)).toBe(false)
  })
})

it('tonoEstado reconoce los estados sin importar mayúsculas', () => {
  expect(tonoEstado('Activo')).toBe('activo')
  expect(tonoEstado('INACTIVO')).toBe('inactivo')
  expect(tonoEstado('Bloqueado')).toBe('bloqueado')
  expect(tonoEstado('Suspendido')).toBe('otro')
})
