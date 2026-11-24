import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { MeResponse } from '@/features/auth/api/auth.contract'
import { ConPermiso } from '@/features/auth/components/ConPermiso'

// Con renderToStaticMarkup zustand devuelve el estado inicial; se simula el selector del store.
const sesion = vi.hoisted(() => ({ autorizacion: undefined as unknown }))
vi.mock('@/features/auth/store/auth.store', () => ({
  useAuthStore: (selector: (s: { user: { autorizacion: unknown } }) => unknown) => selector({ user: { autorizacion: sesion.autorizacion } }),
}))

const VERSION = 'a'.repeat(64)

function conAutorizacion(autorizacion: MeResponse['autorizacion']) {
  sesion.autorizacion = autorizacion
}

function pintar(props: Omit<Parameters<typeof ConPermiso>[0], 'children'>) {
  return renderToStaticMarkup(<ConPermiso {...props}><button type="button">Crear subcuenta</button></ConPermiso>)
}

describe('ConPermiso', () => {
  it('con funciones activas muestra el contenido sólo si la función está, sin mirar la regla anterior', () => {
    conAutorizacion({ version: VERSION, activa: true, funciones: ['contabilidad.cuentas.editar'], rutas: [] })
    expect(pintar({ funcion: 'contabilidad.cuentas.editar', anterior: false })).toContain('Crear subcuenta')
    expect(pintar({ funcion: 'contabilidad.cuentas.eliminar', anterior: true })).toBe('')
  })

  it('con varias funciones basta una', () => {
    conAutorizacion({ version: VERSION, activa: true, funciones: ['cuentas.cupos.verHistorial'], rutas: [] })
    expect(pintar({ funcion: ['cuentas.cupos.consultar', 'cuentas.cupos.verHistorial'], anterior: false })).toContain('Crear subcuenta')
  })

  it('sin funciones del backend decide la regla anterior', () => {
    conAutorizacion(undefined)
    expect(pintar({ funcion: 'contabilidad.cuentas.editar', anterior: true })).toContain('Crear subcuenta')
    expect(pintar({ funcion: 'contabilidad.cuentas.editar', anterior: false })).toBe('')
  })

  it('sin permiso muestra el reemplazo indicado', () => {
    conAutorizacion({ version: VERSION, activa: true, funciones: [], rutas: [] })
    const html = renderToStaticMarkup(
      <ConPermiso funcion="usuarios.consultar" anterior sinPermiso={<p>No tienes acceso</p>}>
        <p>Usuarios</p>
      </ConPermiso>,
    )
    expect(html).toBe('<p>No tienes acceso</p>')
  })
})
