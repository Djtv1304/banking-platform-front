import { describe, expect, it, vi } from 'vitest'
import { permiteFuncion } from '@/features/auth/lib/funciones'
import { getAccessProfile } from '@/features/auth/lib/access'
import { getVisibleSections } from '@/app/navigation/navigation'
import { funcionesDeRuta } from '@/app/router/funciones-ruta'
import type { MeResponse } from '@/features/auth/api/auth.contract'

vi.mock('@/shared/theme', () => ({ useThemeStore: vi.fn() }))

const politica: NonNullable<MeResponse['autorizacion']> = {
  version: 'a'.repeat(64), activa: true, funciones: ['clientes.registrar'], rutas: ['/', '/registrar-cliente'],
}
describe('Funciones efectivas compartidas por la interfaz', () => {
  it.each(['ADMIN', 'SUPERVISOR', 'ASESOR', 'CAJERO', 'CONTADOR', 'AUDITOR', 'APROBADOR_CREDITO'])('no recupera la pantalla retirada para %s con una personalización antigua', (rol) => {
    const personalizacion = { '/seguridad/workos': ['SUPERVISOR'] }
    for (const autorizacion of [undefined, { ...politica, rutas: [...politica.rutas, '/seguridad/workos'] }]) {
      const rutas = getVisibleSections(getAccessProfile([rol]), [rol], [], personalizacion, undefined, {}, autorizacion)
        .flatMap((s) => s.items.map((i) => i.to))
      expect(rutas).not.toContain('/seguridad/workos')
    }
  })
  it('permite conceder y retirar independientemente de los permisos anteriores', () => {
    expect(permiteFuncion(politica, 'clientes.registrar', false)).toBe(true)
    expect(permiteFuncion(politica, 'clientes.editar', true)).toBe(false)
    expect(permiteFuncion(undefined, 'clientes.editar', true)).toBe(true)
  })
  it('muestra Registrar cliente al Supervisor autorizado sin permiso WorkOS equivalente', () => {
    const visibles = getVisibleSections(getAccessProfile(['SUPERVISOR']), ['SUPERVISOR'], [], undefined, undefined, {}, politica)
    const rutas = visibles.flatMap((s) => s.items.map((i) => i.to))
    expect(rutas).toContain('/registrar-cliente')
    expect(rutas).not.toContain('/clientes-busqueda')
    expect(rutas).not.toContain('/seguridad/pestanas')
  })
  it('no confunde abrir cuenta con su consulta ni movimientos con el detalle', () => {
    expect(funcionesDeRuta('/cuentas/abrir')).toEqual(['cuentas.abrir'])
    expect(funcionesDeRuta('/cuentas/13/movimientos')).toEqual(['cuentas.verMovimientos'])
    expect(funcionesDeRuta('/cuentas/13')).toEqual(['cuentas.consultar'])
    expect(funcionesDeRuta('/aprobaciones')).toBeNull()
  })
})
