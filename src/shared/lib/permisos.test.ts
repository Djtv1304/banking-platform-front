import { describe, expect, it } from 'vitest'

import { accionesPermitidas, hasPermission, PERMISOS } from '@/shared/lib/permisos'

describe('accionesPermitidas', () => {
  it('productos depende del permiso general de WorkOS, no del rol', () => {
    expect(accionesPermitidas(['ADMIN'], [])).not.toContain(PERMISOS.productosEditar)
    expect(accionesPermitidas(['CAJERO'], ['prd-editar', 'prd-exportar'])).toEqual(
      expect.arrayContaining([PERMISOS.productosEditar, PERMISOS.productosExportar]),
    )
  })

  it('las demás escrituras dependen del rol, igual que require_roles en el backend', () => {
    const asesor = accionesPermitidas([' asesor '], [])
    expect(hasPermission(asesor, PERMISOS.clientesEditar)).toBe(true)
    expect(hasPermission(asesor, PERMISOS.cuentasCupos)).toBe(false)
    expect(hasPermission(accionesPermitidas(['CONTADOR'], []), PERMISOS.contabilidadEditar)).toBe(true)
  })

  it('un permiso por módulo ya retirado de WorkOS no da acceso', () => {
    expect(accionesPermitidas(['CAJERO'], ['clientes:editar', 'catalogos:editar'])).not.toContain(PERMISOS.clientesEditar)
  })
})
