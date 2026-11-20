import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CuentaContable } from '@/features/contabilidad/api/contabilidad.contract'
import { PlanCuentasPage } from '@/features/contabilidad/pages/PlanCuentasPage'

const cuenta = (id: number, codigo: string, nombre: string, idSuperior: number | null): CuentaContable => ({
  idCuentaContable: id,
  codigoCuenta: codigo,
  nombreCuenta: nombre,
  naturaleza: 'DEUDORA',
  tipoCuenta: 'ACTIVO',
  idCuentaSuperior: idSuperior,
  esImputable: false,
  saldo: 100,
  estado: 'Activo',
})

const estado = vi.hoisted(() => ({
  roles: ['CONTADOR'] as string[],
  plan: { isPending: false, isError: false, data: [] as CuentaContable[] } as Record<string, unknown>,
}))

vi.mock('@/features/auth', async () => {
  const { hasPermission, PERMISOS } = await import('@/shared/lib')
  return {
    useAuthStore: (selector: (state: { user: { permisos: string[] } }) => boolean) =>
      selector({ user: { permisos: estado.roles.includes('CONTADOR') ? ['con-cuenta-editar'] : [] } }),
    usePuedeFuncion: (_funcion: string, anterior: boolean) => anterior,
    hasPermission,
    PERMISOS,
    usePermisos: () => (estado.roles.includes('CONTADOR') ? ['contabilidadEditar'] : []),
  }
})
vi.mock('@/features/contabilidad/hooks/usePlanCuentas', () => ({ usePlanCuentas: () => estado.plan }))
vi.mock('@/features/contabilidad/components/NuevaSubcuentaDialog', () => ({ NuevaSubcuentaDialog: () => <div>dialogo-subcuenta</div> }))
vi.mock('@/features/contabilidad/components/EditarNombreCuentaDialog', () => ({ EditarNombreCuentaDialog: () => null }))
vi.mock('@/features/contabilidad/components/ConfirmarCuentaDialog', () => ({ ConfirmarCuentaDialog: () => null }))
vi.mock('@/shared/ui', () => ({
  Button: ({ children, asChild, ...props }: ComponentProps<'button'> & { asChild?: boolean }) =>
    asChild ? children : <button {...props}>{children}</button>,
  Badge: ({ children }: ComponentProps<'span'>) => <span>{children}</span>,
  Input: (props: ComponentProps<'input'>) => <input {...props} />,
  Label: ({ children }: ComponentProps<'label'>) => <label>{children}</label>,
  Checkbox: () => <input type="checkbox" />,
  Aviso: ({ children }: ComponentProps<'div'>) => <div>{children}</div>,
  Cargando: ({ texto }: { texto: string }) => <div>{texto}</div>,
}))

const html = () => renderToStaticMarkup(<MemoryRouter><PlanCuentasPage /></MemoryRouter>)

beforeEach(() => {
  estado.roles = ['CONTADOR']
  estado.plan = {
    isPending: false,
    isError: false,
    data: [cuenta(1, '1', 'Activo', null), cuenta(11, '11', 'Fondos disponibles', 1), cuenta(1101, '1101', 'Caja', 11)],
  }
})

describe('PlanCuentasPage', () => {
  it('pinta el árbol con el primer nivel abierto y sin las ramas cerradas', () => {
    const salida = html()
    expect(salida).toContain('role="tree"')
    expect(salida).toContain('Fondos disponibles')
    expect(salida).not.toContain('Caja')
    expect(salida).toMatch(/aria-label="1 Activo"[^>]*aria-expanded="true"/)
    expect(salida).toMatch(/aria-label="11 Fondos disponibles"[^>]*aria-expanded="false"/)
  })

  it('solo una fila entra en el orden de tabulación', () => {
    expect(html().match(/tabindex="0"/g)).toHaveLength(1)
  })

  it('el auditor ve que su acceso es de solo consulta y no monta los diálogos de mantenimiento', () => {
    estado.roles = ['AUDITOR']
    expect(html()).toContain('solo consulta')
    expect(html()).not.toContain('dialogo-subcuenta')
    expect(html()).not.toContain('Importar catálogo')
    estado.roles = ['CONTADOR']
    expect(html()).toContain('dialogo-subcuenta')
    expect(html()).toContain('href="/contabilidad/importar-catalogo"')
  })

  it('muestra los estados de carga, vacío y error', () => {
    estado.plan = { isPending: true, isError: false, data: undefined }
    expect(html()).toContain('Cargando el plan de cuentas')
    estado.plan = { isPending: false, isError: false, data: [] }
    expect(html()).toContain('Todavía no hay cuentas')
    estado.plan = { isPending: false, isError: true, data: undefined, error: new Error('x'), refetch: vi.fn() }
    expect(html()).toContain('Reintentar')
  })
})
