import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SelectorAgencia } from '@/features/auth/components/SelectorAgencia'
import { describe, expect, it, vi } from 'vitest'
vi.mock('@/shared/theme', () => ({ useThemeStore: vi.fn() }))
import { getPestanasConfigurables, getRoleNavigation, getVisibleSections } from '@/app/navigation/navigation'
import { getAccessProfile, PERMISOS } from '@/features/auth'
import { ROLES_USUARIO } from '@/features/usuarios'

const opciones = (rol: string) => getRoleNavigation(rol).flatMap((s) => s.opciones.map((o) => o.titulo))

describe('vista de roles y menú comparten la configuración', () => {
  it('Aprobaciones requiere capacidad efectiva y no se ofrece como seccion configurable', () => {
    const rutas = (efectiva: boolean) => getVisibleSections(getAccessProfile(['CONTADOR']), ['CONTADOR'], [], { '/aprobaciones': ['CONTADOR'] }, undefined, { aprobaciones: efectiva }).flatMap(s => s.items.map(i => i.to))
    expect(rutas(false)).not.toContain('/aprobaciones')
    expect(rutas(true)).toContain('/aprobaciones')
    expect(getPestanasConfigurables().map(p => p.to)).not.toContain('/aprobaciones')
  })
  it.each(ROLES_USUARIO)('%s muestra exactamente las opciones del menú, sin mantener otra matriz', (rol) => {
    const menu = getVisibleSections(getAccessProfile([rol]), [rol], []).flatMap((s) => s.items.map((i) => i.label))
    expect(opciones(rol)).toEqual(menu)
  })
  it('solo ADMIN ve Usuarios y Roles y accesos', () => {
    expect(opciones('ADMIN')).toEqual(expect.arrayContaining(['Usuarios del sistema', 'Roles y accesos']))
    for (const rol of ROLES_USUARIO.filter((r) => r !== 'ADMIN')) {
      expect(opciones(rol)).not.toContain('Usuarios del sistema')
      expect(opciones(rol)).not.toContain('Roles y accesos')
    }
  })
  it('conserva contabilidad y no presenta roles desconocidos como roles del sistema', () => {
    expect(opciones('CONTADOR')).toEqual(expect.arrayContaining(['Plan de cuentas', 'Asientos contables', 'Fecha contable']))
    expect(opciones('NO_EXISTE')).toEqual([])
  })
})


it('consultar cuentas conserva los roles del backend y no aparece para contador', () => {
  expect(opciones('CONTADOR')).not.toContain('Consultar cuentas')
  for (const rol of ['ADMIN', 'SUPERVISOR', 'ASESOR', 'CAJERO']) {
    expect(opciones(rol)).toContain('Consultar cuentas')
  }
})


describe('contratos de consulta por rol', () => {
  it('contador y auditor solo reciben consultas contables y de bóvedas del menu disponible', () => {
    for (const rol of ['CONTADOR', 'AUDITOR']) {
      expect(opciones(rol)).toEqual(['Inicio', 'Bóvedas', 'Plan de cuentas', 'Asientos contables', 'Fecha contable'])
    }
  })

  it.each(['SUPERVISOR', 'CONTADOR', 'AUDITOR', 'ADMIN'])('%s ve Bóvedas (BOV-01 a BOV-03)', (rol) => {
    expect(opciones(rol)).toContain('Bóvedas')
  })

  it.each(['ASESOR', 'CAJERO', 'APROBADOR_CREDITO'])('%s no ve Bóvedas', (rol) => {
    expect(opciones(rol)).not.toContain('Bóvedas')
  })

  it.each(['ASESOR', 'SUPERVISOR', 'ADMIN'])('%s puede consultar tarjetas', (rol) => {
    expect(opciones(rol)).toContain('Consultar tarjetas')
  })

  it.each(['CAJERO', 'CONTADOR', 'AUDITOR', 'APROBADOR_CREDITO'])('%s no recibe consulta general de tarjetas', (rol) => {
    expect(opciones(rol)).not.toContain('Consultar tarjetas')
  })

  it('no presenta creditos en preparacion al aprobador sin un flujo implementado para su rol', () => {
    expect(opciones('APROBADOR_CREDITO')).toEqual(['Inicio'])
  })

  it('los permisos reales siguen determinando las entradas de escritura', () => {
    const secciones = getVisibleSections(getAccessProfile(['ASESOR']), ['ASESOR'], [])
    expect(secciones.flatMap((s) => s.items.map((i) => i.to))).not.toContain('/cuentas/abrir')
    const conPermiso = getVisibleSections(getAccessProfile(['ASESOR']), ['ASESOR'], ['cuentasAbrir'])
    expect(conPermiso.flatMap((s) => s.items.map((i) => i.to))).toContain('/cuentas/abrir')
  })

  it('los roles combinados conservan las consultas autorizadas por cualquiera de ellos', () => {
    const items = getVisibleSections(getAccessProfile(['CONTADOR', 'SUPERVISOR']), ['CONTADOR', 'SUPERVISOR'], []).flatMap((s) => s.items.map((i) => i.to))
    expect(items).toContain('/contabilidad')
    expect(items).toContain('/tarjetas')
    expect(items).not.toContain('/usuarios')
  })
})


describe('matriz completa de consultas del menu por rol', () => {
  const rutas: Record<string, string[]> = {
    ADMIN: ['/', '/organizacion/entidad', '/parametros', '/organizacion/agencias', '/productos', '/catalogos', '/clientes-busqueda', '/cuentas', '/creditos', '/tarjetas', '/bovedas', '/contabilidad', '/contabilidad/asientos', '/contabilidad/fecha-contable', '/usuarios', '/seguridad/pestanas', '/seguridad/roles'],
    ASESOR: ['/', '/organizacion/entidad', '/parametros', '/productos', '/catalogos', '/clientes-busqueda', '/cuentas', '/creditos', '/tarjetas'],
    CAJERO: ['/', '/clientes-busqueda', '/cuentas'],
    SUPERVISOR: ['/', '/parametros', '/productos', '/catalogos', '/clientes-busqueda', '/cuentas', '/tarjetas', '/bovedas'],
    APROBADOR_CREDITO: ['/', '/productos'],
    CONTADOR: ['/', '/productos', '/bovedas', '/contabilidad', '/contabilidad/asientos', '/contabilidad/fecha-contable'],
    AUDITOR: ['/', '/productos', '/bovedas', '/contabilidad', '/contabilidad/asientos', '/contabilidad/fecha-contable'],
  }
  it.each(Object.entries(rutas))('%s respeta todos los contratos de consulta disponibles', (rol, esperadas) => {
    // Productos se consulta con prd-consultar, que en WorkOS tienen todos los roles menos CAJERO
    const acciones = rol === 'CAJERO' ? [] : [PERMISOS.productosConsultar]
    const actuales = getVisibleSections(getAccessProfile([rol]), [rol], acciones).flatMap((s) => s.items.map((i) => i.to))
    expect(actuales).toEqual(esperadas)
  })
})


describe('presentacion del alcance de agencias', () => {
  it.each([
    ['admin', 4, true, true, false],
    ['una agencia', 1, false, false, false],
    ['varias parciales', 2, false, false, true],
    ['todas asignadas', 4, false, true, false],
  ])('%s: selector=%s', (_nombre, cantidad, global, todas, selector) => {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } })
    const agencias = Array.from({ length: Number(cantidad) }, (_, i) => ({ idAgencia: String(i + 1).padStart(3, '0'), codigo: 'Agencia ' + (i + 1), estado: 'A', principal: i === 0 }))
    client.setQueryData(['auth', 'agencias'], { idAgencia: global ? null : '001', idAgenciaPrincipal: '001', agenciasAsignadas: agencias, agenciasPermitidas: agencias, requiereSeleccionAgencia: false, alcanceGlobal: global, accesoTodasAgencias: todas })
    const html = renderToStaticMarkup(createElement(QueryClientProvider, { client }, createElement(SelectorAgencia)))
    expect(html.includes('<select')).toBe(selector)
    if (todas) expect(html).toContain('Acceso a todas las agencias')
    if (cantidad === 1) expect(html).toContain('Agencia operativa: Agencia 1')
    client.clear()
  })
})

describe('pestañas por rol (SEG07)', () => {
  const rutas = (rol: string, pestanas?: Record<string, readonly string[]>) =>
    getVisibleSections(getAccessProfile([rol]), [rol], [], pestanas).flatMap((s) => s.items.map((i) => i.to))

  it('la configuración reemplaza los roles por defecto de la pestaña', () => {
    expect(rutas('CAJERO')).not.toContain('/catalogos')
    expect(rutas('CAJERO', { '/catalogos': ['CAJERO'] })).toContain('/catalogos')
    expect(rutas('ASESOR', { '/catalogos': ['CAJERO'] })).not.toContain('/catalogos')
  })

  it('las pestañas de Seguridad e Inicio no se personalizan', () => {
    expect(rutas('ADMIN', { '/seguridad/roles': [], '/seguridad/pestanas': [], '/': [] })).toEqual(
      expect.arrayContaining(['/', '/seguridad/roles', '/seguridad/pestanas']),
    )
    const configurables = getPestanasConfigurables().map((p) => p.to)
    expect(configurables).not.toContain('/')
    expect(configurables).not.toContain('/seguridad/roles')
    expect(configurables).not.toContain('/seguridad/workos')
  })

  it('cada pestaña configurable trae los roles que la ven por defecto', () => {
    const catalogos = getPestanasConfigurables().find((p) => p.to === '/catalogos')
    expect(catalogos?.rolesPorDefecto).toContain('ADMIN')
    expect(catalogos?.rolesPorDefecto).not.toContain('CAJERO')
    expect(getPestanasConfigurables().find((p) => p.to === '/cuentas/abrir')?.requiereAccion).toBe(true)
    expect(getPestanasConfigurables().find((p) => p.to === '/solicitar-tarjeta')?.rolesPorDefecto).toEqual(['ADMIN', 'ASESOR'])
  })
})
