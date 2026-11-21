import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AsignacionesTipo, ClaseCuenta } from '@/features/contabilidad/api/cuentas-producto.contract'
import { CuentasProductoPage } from '@/features/contabilidad/pages/CuentasProductoPage'

const clase = (cambios: Partial<ClaseCuenta>): ClaseCuenta => ({
  idClase: 1,
  idTipoProducto: 1,
  codigoTipoProducto: 'CUENTA_AHORRO',
  idTipoCredito: null,
  codigoTipoCredito: null,
  codigoRol: 'CAPITAL',
  nombreRol: 'Capital',
  situacion: null,
  condicion: null,
  tramo: null,
  cuentaBase: '210135',
  nombreCuentaBase: 'Depósitos de ahorro',
  nivel: 'PRODUCTO',
  obligatorio: true,
  soloConTasa: false,
  ...cambios,
})

const estado = vi.hoisted(() => ({
  permisos: [] as string[],
  datos: null as unknown,
}))

vi.mock('@/features/auth', async () => {
  const { hasPermission, PERMISOS } = await import('@/shared/lib')
  return { hasPermission, PERMISOS, usePermisos: () => estado.permisos }
})
vi.mock('@/features/contabilidad/hooks/usePlanCuentas', () => ({ usePlanCuentas: () => ({ data: [] }) }))
vi.mock('@/features/contabilidad/components/AsignarCuentaDialog', () => ({ AsignarCuentaDialog: () => <div>dialogo-asignar</div> }))
vi.mock('@/features/contabilidad/hooks/useCuentasProducto', () => ({
  useClasesCuenta: () => ({
    isPending: false,
    isError: false,
    data: [
      clase({}),
      clase({ idClase: 2, codigoRol: 'RESTRINGIDO', nombreRol: 'Depósitos restringidos', cuentaBase: '2105', nivel: 'TIPO' }),
      clase({ idClase: 3, codigoRol: 'INTERES_GASTO', nombreRol: 'Gasto de intereses', cuentaBase: '410115', nivel: 'TIPO', soloConTasa: true }),
    ],
  }),
  useAsignacionesTipo: () => ({ isPending: false, isError: false, data: estado.datos }),
  useSolicitarAsignaciones: () => ({ isPending: false, mutate: vi.fn() }),
}))
vi.mock('@/shared/ui', () => ({
  Button: ({ children, ...props }: ComponentProps<'button'>) => <button {...props}>{children}</button>,
  Aviso: ({ children }: ComponentProps<'div'>) => <div>{children}</div>,
  AvisoRequiereAprobacion: ({ idSolicitud }: { idSolicitud: number }) => <div>pendiente #{idSolicitud}</div>,
  Cargando: ({ texto }: { texto: string }) => <div>{texto}</div>,
}))

const datos = (cambios: Partial<AsignacionesTipo> = {}): AsignacionesTipo => ({
  asignaciones: [
    {
      idCuentaProducto: 1, idClase: 1, idProducto: 1, codigoProducto: 'AHO001', idSubProducto: null, codigoSubProducto: null,
      idCuentaContable: 11, codigoCuenta: '21013505', nombreCuenta: 'Ahorro a la vista', vigenciaDesde: '2026-01-01', vigenciaHasta: null, idSolicitud: null,
    },
    {
      idCuentaProducto: 2, idClase: 2, idProducto: null, codigoProducto: null, idSubProducto: null, codigoSubProducto: null,
      idCuentaContable: 12, codigoCuenta: '2105', nombreCuenta: 'Depósitos restringidos', vigenciaDesde: '2026-01-01', vigenciaHasta: null, idSolicitud: null,
    },
  ],
  productos: [
    { idProducto: 1, codigoProducto: 'AHO001', nombreProducto: 'Ahorro a la vista', idTipoCredito: null },
    { idProducto: 2, codigoProducto: 'AHO002', nombreProducto: 'Ahorro Objetivo', idTipoCredito: null },
  ],
  subproductos: [],
  solicitudPendiente: null,
  ...cambios,
})

const html = () => renderToStaticMarkup(<MemoryRouter><CuentasProductoPage /></MemoryRouter>)

beforeEach(() => {
  estado.permisos = []
  estado.datos = datos()
})

describe('CuentasProductoPage', () => {
  it('muestra el capital por producto, los roles del tipo y las cuentas faltantes', () => {
    const salida = html()
    expect(salida).toContain('Cuenta de ahorro')
    expect(salida).toContain('21013505')
    expect(salida).toContain('AHO002 · Ahorro Objetivo')
    expect(salida).toContain('Sin cuenta')
    expect(salida).toContain('si la tasa es mayor que 0')
    expect(salida).toContain('Tienes acceso de solo consulta.')
    expect(salida).not.toContain('Cambiar')
  })

  it('el contador puede cambiar asignaciones y ve la solicitud en curso', () => {
    estado.permisos = ['cuentasProductoEditar']
    estado.datos = datos({ solicitudPendiente: 77 })
    const salida = html()
    expect(salida).toContain('Cambiar')
    expect(salida).toContain('pendiente #77')
    expect(salida).toContain('dialogo-asignar')
  })
})
