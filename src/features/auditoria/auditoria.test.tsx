import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError, apiClient } from '@/shared/api'
import { descargarCsv } from '@/shared/lib'
import { buscarEventos, exportarEventos, obtenerEvento } from '@/features/auditoria/api/auditoria.api'
import { detalleEventoSchema, type DetalleEvento as Detalle, type EventoItem } from '@/features/auditoria/api/auditoria.contract'
import { DetalleEvento } from '@/features/auditoria/components/DetalleEvento'
import { PestanaHistorial } from '@/features/auditoria/components/PestanaHistorial'
import { aFiltros, esquemaFiltros, type FormularioFiltros } from '@/features/auditoria/lib/filtros'
import { fechaEcuador, textoFechaLocal } from '@/features/auditoria/lib/presentacion'

vi.mock('@/shared/theme', () => ({ useThemeStore: vi.fn() }))
// El barril de auth necesita el navegador; aquí solo interesan los roles de la sesión
const auth = vi.hoisted(() => ({ roles: undefined as string[] | undefined }))
vi.mock('@/features/auth', () => ({
  AUDITORIA_ROLES: ['ADMIN', 'SUPERVISOR', 'AUDITOR'],
  hasAnyRole: (roles: readonly string[], permitidos: readonly string[]) => roles.some((r) => permitidos.includes(r)),
  useAuthStore: (selector: (estado: { user: { roles: string[] } | null }) => unknown) => selector({ user: auth.roles ? { roles: auth.roles } : null }),
}))
vi.mock('@/shared/lib', async (original) => ({ ...await original<typeof import('@/shared/lib')>(), descargarCsv: vi.fn() }))

const evento = (cambios: Partial<EventoItem> = {}): EventoItem => ({
  id: 100, idEvento: '3f2b0c1e-0000-4000-8000-000000000001', codigoEvento: 'CLI_EDICION', modulo: 'clientes', severidad: 'Sensible',
  fechaHoraUtc: '2026-11-20T18:00:00Z', fechaHoraLocal: '2026-11-20T13:00:00-05:00', usuario: 7, nombreUsuario: 'Ana Pérez',
  agencia: '001', canal: 'WEB', origen: '10.0.0.1', resultado: 'Exitoso', tipoObjetivo: 'Clientes.Cliente', idObjetivo: '15',
  correlacion: 'corr-1', descripcion: 'cambio de apellido', formatoAnterior: false, ...cambios,
})
const detalle = (cambios: Partial<Detalle> = {}): Detalle => ({ ...evento(), cambios: null, aprobacion: null, relacionados: [], ...cambios })
const formulario = (cambios: Partial<FormularioFiltros> = {}): FormularioFiltros => ({
  desde: '2026-11-01', hasta: '2026-11-20', usuario: '', agencia: '', modulo: '', codigoEvento: '', resultado: '',
  tipoObjetivo: '', idObjetivo: '', origen: '', canal: '', correlacion: '', idSolicitud: '', ...cambios,
})
const pintar = (nodo: React.ReactNode) => renderToStaticMarkup(
  <QueryClientProvider client={new QueryClient()}><MemoryRouter>{nodo}</MemoryRouter></QueryClientProvider>,
)
const sesion = (roles: string[]) => { auth.roles = roles }

beforeEach(() => vi.restoreAllMocks())
afterEach(() => { auth.roles = undefined })

describe('E8-01 · búsqueda', () => {
  it('envía el rango y los filtros en el cuerpo, nunca en la URL (ASVS 14.2.1)', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { items: [evento()], total: 1, page: 1, pageSize: 25 } })
    const filtros = aFiltros(formulario({ agencia: '001', resultado: 'Fallido', idSolicitud: '9' }))
    await buscarEventos({ ...filtros, page: 1, pageSize: 25 })
    expect(post).toHaveBeenCalledWith('/api/v1/auditoria/eventos/busqueda', {
      desde: '2026-11-01', hasta: '2026-11-20', agencia: '001', resultado: 'Fallido', idSolicitud: 9, page: 1, pageSize: 25,
    })
    expect(post.mock.calls[0]).toHaveLength(2)
  })
  it('el rango es obligatorio y la fecha de fin no puede ser anterior (no se envía nada)', () => {
    expect(esquemaFiltros.safeParse(formulario({ desde: '' })).error?.issues[0].message).toBe('Indica la fecha de inicio.')
    expect(esquemaFiltros.safeParse(formulario({ hasta: '2026-10-01' })).error?.issues[0].path).toEqual(['hasta'])
    expect(esquemaFiltros.safeParse(formulario({ agencia: '1' })).success).toBe(false)
    expect(esquemaFiltros.safeParse(formulario()).success).toBe(true)
  })
  it('la fecha por defecto es la del calendario de Ecuador y se muestra con su zona', () => {
    expect(fechaEcuador(0, new Date('2026-11-27T03:00:00Z'))).toBe('2026-11-26')
    expect(textoFechaLocal('2026-11-20T13:00:00-05:00')).toBe('2026-11-20 13:00:00 (hora de Ecuador)')
  })
})

describe('E8-01 · detalle del evento', () => {
  it('muestra antes y después enmascarados tal como llegan y la aprobación con solicitante y aprobador', () => {
    const html = pintar(<DetalleEvento evento={detalle({
      cambios: { antes: { apellidos: 'L****' }, despues: { apellidos: 'G*****' } },
      aprobacion: {
        idSolicitud: 4, operacion: 'CLI-EDITAR', estado: 'Ejecutada', fechaSolicitud: '2026-11-20T17:00:00Z', fechaResolucion: '2026-11-20T17:30:00Z',
        solicitante: { nombre: 'Ana Pérez', idInterno: 7 }, aprobador: { nombre: 'Carlos Ruiz', idInterno: 8 },
      },
    })} />)
    expect(html).toContain('L****')
    expect(html).toContain('G*****')
    expect(html).toContain('Ana Pérez')
    expect(html).toContain('Carlos Ruiz')
    expect(html).toContain('/aprobaciones/4')
  })
  it('un cambio sin tabla de historial se muestra completo, sin truncar', () => {
    const largo = 'A'.repeat(2000)
    const html = pintar(<DetalleEvento evento={detalle({ tipoObjetivo: 'Organizacion.Agencia', cambios: { antes: { direccion: largo }, despues: { direccion: 'Av. Nueva' } } })} />)
    expect(html).toContain(largo)
  })
  it('lista los eventos de la misma petición con enlace por su identificador de bitácora', () => {
    const html = pintar(<DetalleEvento evento={detalle({ relacionados: [evento({ id: 101, codigoEvento: 'AUD_LECTURA' })] })} />)
    expect(html).toContain('Eventos de la misma petición')
    expect(html).toContain('href="/auditoria/eventos/101"')
  })
  it('marca las filas del formato anterior', () => {
    expect(pintar(<DetalleEvento evento={detalle({ formatoAnterior: true, fechaHoraLocal: null })} />)).toContain('Formato anterior')
  })
  it('rechaza una respuesta que corresponde a otro evento', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: detalle({ id: 5 }) })
    await expect(obtenerEvento(100)).rejects.toBeInstanceOf(ApiError)
  })
  it('el contrato acepta los campos nulos del formato anterior', () => {
    expect(detalleEventoSchema.safeParse(detalle({ codigoEvento: null, modulo: null, severidad: null, fechaHoraUtc: null, resultado: null })).success).toBe(true)
  })
})

describe('E8-01 · pestaña Historial', () => {
  it('no se muestra a un rol sin acceso a la bitácora', () => {
    sesion(['CAJERO'])
    expect(pintar(<PestanaHistorial tipo="Clientes.Cliente" id={15} />)).toBe('')
  })
  it('se muestra al auditor en cualquier ficha', () => {
    sesion(['AUDITOR'])
    const html = pintar(<PestanaHistorial tipo="Cuentas.Cuenta" id={1} />)
    expect(html).toContain('Historial de auditoría')
    expect(html).toContain('Cargando historial de auditoría')
  })
})

describe('E8-01 · exportación', () => {
  it('CSV: mismo cuerpo con el formato y descarga sin guardar en caché', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: 'id\n1', status: 200 })
    await exportarEventos({ desde: '2026-11-01', hasta: '2026-11-20', formato: 'csv' })
    expect(post).toHaveBeenCalledWith('/api/v1/auditoria/eventos/exportacion', { desde: '2026-11-01', hasta: '2026-11-20', formato: 'csv' }, { responseType: 'text' })
    expect(descargarCsv).toHaveBeenCalledWith('auditoria-2026-11-01-2026-11-20.csv', 'id\n1')
  })
  it('PDF: rechaza una respuesta que no es un PDF', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({ data: new Blob(['<html>'], { type: 'text/html' }), status: 200 })
    await expect(exportarEventos({ desde: '2026-11-01', hasta: '2026-11-20', formato: 'pdf' })).rejects.toBeInstanceOf(ApiError)
  })
})
