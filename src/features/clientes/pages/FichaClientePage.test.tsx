import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Cliente } from '@/features/clientes/api/clientes.contract'
import { FichaClientePage } from '@/features/clientes/pages/FichaClientePage'

const h = vi.hoisted(() => ({ funciones: [] as string[] }))

vi.mock('@/shared/theme', () => ({ useThemeStore: vi.fn() }))
vi.mock('@/features/auth', () => ({
  usePuedeFuncion: (funcion: string) => h.funciones.includes(funcion),
  useAuthStore: (selector: (estado: unknown) => unknown) => selector({ user: { roles: [] } }),
  usePermisos: () => [],
}))
vi.mock('@/features/catalogos', () => ({ useAgencias: () => ({ data: [{ idAgencia: '001', nombre: 'Matriz Quito' }] }) }))
vi.mock('@/features/clientes/components/GestionCliente', () => ({ GestionCliente: () => <p>acciones</p> }))
vi.mock('@/features/clientes/components/GestionRiesgo', () => ({ GestionRiesgo: () => <p>seccion-riesgo</p> }))
vi.mock('@/features/clientes/components/GestionDirecciones', () => ({ GestionDirecciones: () => <p>seccion-direcciones</p> }))
vi.mock('@/features/clientes/components/HistorialCliente', () => ({ HistorialCliente: () => null }))
vi.mock('@/features/clientes/components/IndicadorHabilitacion', () => ({ IndicadorHabilitacion: () => <p>habilitacion</p> }))
vi.mock('@/features/clientes/components/CampoEnmascarado', () => ({
  CampoEnmascarado: ({ campo, valor }: { campo: string; valor: string }) => <span data-campo={campo}>{valor}</span>,
}))

const cliente: Cliente = {
  idCliente: 42, identificacion: '******4065', tipoDocumento: 'C', tipoCliente: 'Natural', nombres: 'María', apellidos: 'Pérez',
  razonSocial: null, nombreComercial: null, estadoCivil: 'Soltero', idActividadEconomica: null, estado: 'Activo',
  email: 'm***@correo.ec', telefonoCelular: '******4567', telefonoConvencional: null, fechaNacimiento: '1992-05-14',
  fechaRegistro: '2026-11-06T10:00:00Z', direcciones: [], emailVerificado: false, idAgenciaRegistro: '001',
}
vi.mock('@/features/clientes/hooks/useConsultaClientes', () => ({
  useCliente: () => ({ data: cliente, isPending: false, isError: false, error: null }),
}))

const render = () => renderToStaticMarkup(
  <MemoryRouter initialEntries={['/clientes-busqueda/42']}>
    <Routes><Route path="/clientes-busqueda/:idCliente" element={<FichaClientePage />} /></Routes>
  </MemoryRouter>,
)

beforeEach(() => { h.funciones = ['clientes.consultar'] })

describe('E5-05 · ficha con datos enmascarados por sección', () => {
  it('usa CampoEnmascarado para documento, correo y celular y muestra la agencia de registro', () => {
    const html = render()
    for (const campo of ['identificacion', 'email', 'telefonoCelular']) expect(html).toContain(`data-campo="${campo}"`)
    expect(html).toContain('001 · Matriz Quito')
    expect(html).toContain('habilitacion')
    expect(html).toContain('Identidad')
    expect(html).toContain('Contacto')
  })

  it('el cajero (solo consulta) ve la ficha reducida: sin direcciones ni riesgo', () => {
    const html = render()
    expect(html).not.toContain('seccion-direcciones')
    expect(html).not.toContain('href="#ficha-direcciones"')
    expect(html).not.toContain('href="#riesgo-titulo"')
  })

  it('con las funciones correspondientes muestra direcciones y riesgo', () => {
    h.funciones = ['clientes.consultar', 'clientes.direcciones.consultar', 'clientes.riesgo.consultar']
    const html = render()
    expect(html).toContain('seccion-direcciones')
    expect(html).toContain('seccion-riesgo')
    expect(html).toContain('href="#riesgo-titulo"')
  })
})
