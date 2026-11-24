import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Asiento } from '@/features/contabilidad/api/asientos.contract'
import type { CuentaContable } from '@/features/contabilidad/api/contabilidad.contract'
import { idDeRuta } from '@/features/contabilidad/lib/asiento-manual'
import { NuevoAsientoPage } from '@/features/contabilidad/pages/NuevoAsientoPage'

vi.mock('@/shared/theme', () => ({ useThemeStore: vi.fn() }))

const cuenta = (id: number, codigo: string): CuentaContable => ({
  idCuentaContable: id, codigoCuenta: codigo, nombreCuenta: `Cuenta ${codigo}`, naturaleza: 'DEUDORA', tipoCuenta: 'ACTIVO',
  idCuentaSuperior: null, esImputable: true, saldo: 0, estado: 'Activo',
})

const borrador = (extra: Partial<Asiento> = {}): Asiento => ({
  idAsientoContable: 41, numeroAsiento: 'AS-000041', fechaAsiento: '2026-11-23', idTipoAsiento: 9, origen: 'MANUAL',
  concepto: 'Provisión de intereses', totalDebito: 10, totalCredito: 10, estado: 'BORRADOR', idAsientoReversion: null,
  idAgencia: '002', detalle: [], ...extra,
})

const estado = vi.hoisted(() => ({
  plan: {} as Record<string, unknown>,
  asiento: {} as Record<string, unknown>,
  contexto: { idAgencia: '001', alcanceGlobal: false, accesoTodasAgencias: false, agenciasPermitidas: [{ idAgencia: '001' }] } as Record<string, unknown>,
}))

vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: estado.contexto }) }))
vi.mock('@/features/auth', () => ({ obtenerContextoAgencias: vi.fn() }))
vi.mock('@/features/catalogos', () => ({
  useAgencias: () => ({ data: [{ idAgencia: '001', nombre: 'Matriz' }, { idAgencia: '002', nombre: 'Norte' }] }),
}))
vi.mock('@/features/contabilidad/hooks/usePlanCuentas', () => ({ usePlanCuentas: () => estado.plan }))
vi.mock('@/features/contabilidad/hooks/useAsientos', () => ({ useAsiento: () => estado.asiento }))
vi.mock('@/features/contabilidad/hooks/useAsientoManual', () => ({
  useGuardarAsiento: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useEnviarAsiento: () => ({ isPending: false, mutateAsync: vi.fn() }),
}))

const html = (ruta = '/contabilidad/asientos/nuevo', state?: unknown) =>
  renderToStaticMarkup(
    <MemoryRouter initialEntries={[{ pathname: ruta, state }]}>
      <Routes>
        <Route path="/contabilidad/asientos/nuevo" element={<NuevoAsientoPage />} />
        <Route path="/contabilidad/asientos/:idAsiento/editar" element={<NuevoAsientoPage />} />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  estado.plan = { isPending: false, isError: false, data: [cuenta(2, '110105'), cuenta(3, '210135')] }
  estado.asiento = { isPending: false, isError: false, data: undefined }
  estado.contexto = { idAgencia: '001', alcanceGlobal: false, accesoTodasAgencias: false, agenciasPermitidas: [{ idAgencia: '001' }] }
})

describe('idDeRuta', () => {
  it.each([[undefined, null], ['41', 41], ['0', undefined], ['abc', undefined], ['4.5', undefined]])('%s → %s', (parametro, esperado) => {
    expect(idDeRuta(parametro)).toBe(esperado)
  })
})

describe('NuevoAsientoPage (E4-04)', () => {
  it('tras enviar muestra la confirmación aunque el asiento recargado ya no sea borrador', () => {
    estado.asiento = { isPending: false, isError: false, data: borrador({ estado: 'PENDIENTE_APROBACION' }) }
    const pagina = html('/contabilidad/asientos/41/editar', { enviado: { pendiente: true } })
    expect(pagina).toContain('Asiento enviado a aprobación')
    expect(pagina).toContain('href="/aprobaciones"')
    expect(pagina).not.toContain('Sólo se editan los borradores')
  })

  it('sin el aviso de envío, un asiento pendiente no se edita', () => {
    estado.asiento = { isPending: false, isError: false, data: borrador({ estado: 'PENDIENTE_APROBACION' }) }
    expect(html('/contabilidad/asientos/41/editar')).toContain('Sólo se editan los borradores')
    expect(html('/contabilidad/asientos/41/editar', { enviado: 'sí' })).toContain('Sólo se editan los borradores')
  })

  it('pinta concepto, agencia, grilla y las dos acciones; enviar empieza deshabilitado', () => {
    const pagina = html()
    expect(pagina).toContain('Nuevo asiento manual')
    expect(pagina).toContain('for="asiento-concepto"')
    expect(pagina).toContain('fecha contable vigente')
    expect(pagina).toContain('Guardar borrador')
    expect(pagina).toMatch(/<button[^>]*disabled=""[^>]*aria-describedby="asiento-motivo"[^>]*>Enviar a aprobación/)
    expect(pagina).toContain('Escribe el concepto del asiento.')
  })

  it('una agencia operativa queda fija en la suya y no ofrece las ajenas', () => {
    const pagina = html()
    expect(pagina).toMatch(/<select[^>]*id="asiento-agencia"[^>]*disabled=""/)
    expect(pagina).toContain('Matriz')
    expect(pagina).not.toContain('Norte')
  })

  it('con acceso a todas las agencias puede elegir cualquiera', () => {
    estado.contexto = { idAgencia: '001', alcanceGlobal: false, accesoTodasAgencias: true, agenciasPermitidas: [] }
    const pagina = html()
    expect(pagina).toContain('Norte')
    expect(pagina).not.toMatch(/<select[^>]*id="asiento-agencia"[^>]*disabled=""/)
  })

  it('al editar carga el concepto del borrador', () => {
    estado.contexto = { idAgencia: '001', alcanceGlobal: true, accesoTodasAgencias: false, agenciasPermitidas: [] }
    estado.asiento = { isPending: false, isError: false, data: borrador() }
    const pagina = html('/contabilidad/asientos/41/editar')
    expect(pagina).toContain('Editar borrador de asiento')
    expect(pagina).toContain('Provisión de intereses')
  })

  it('tras guardar desde «nuevo» el formulario remontado conserva el aviso de borrador guardado', () => {
    estado.asiento = { isPending: false, isError: false, data: borrador() }
    expect(html('/contabilidad/asientos/41/editar', { guardado: true })).toContain('Borrador guardado.')
    expect(html('/contabilidad/asientos/41/editar')).not.toContain('Borrador guardado.')
  })

  it('un asiento que ya no es borrador no se edita', () => {
    estado.asiento = { isPending: false, isError: false, data: borrador({ estado: 'CONTABILIZADO' }) }
    const pagina = html('/contabilidad/asientos/41/editar')
    expect(pagina).toContain('Sólo se editan los borradores')
    expect(pagina).not.toContain('Guardar borrador')
  })

  it('un id inválido en el enlace se explica', () => {
    expect(html('/contabilidad/asientos/abc/editar')).toContain('El enlace del asiento no es válido.')
  })

  it('mientras carga el plan muestra la espera', () => {
    estado.plan = { isPending: true, isError: false }
    expect(html()).toContain('Preparando el asiento…')
  })
})
