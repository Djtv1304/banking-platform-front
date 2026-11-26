import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { GestionRiesgo } from '@/features/clientes/components/GestionRiesgo'
import type { Riesgo } from '@/features/clientes/api/riesgo'

const mockQueryState = vi.hoisted(() => ({
  data: [] as Riesgo[],
  isPending: false,
  isError: false,
  isSuccess: true,
}))

vi.mock('@/shared/theme', () => ({ useThemeStore: vi.fn() }))
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => mockQueryState,
  useMutation: () => ({ isPending: false, error: null, reset: vi.fn(), mutateAsync: vi.fn() }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))
vi.mock('@/features/auth', () => ({
  useAuthStore: () => ['ASESOR'],
  usePermisos: () => ['clientesRiesgo'],
  usePuedeFuncion: () => true,
}))
vi.mock('react-router', () => ({
  Link: ({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) => (
    <a href={to} className={className}>{children}</a>
  ),
}))

const evaluacionBase: Riesgo = {
  idEvaluacion: 101,
  idCliente: 42,
  fechaEvaluacion: '2026-11-01T10:00:00Z',
  evaluador: 5,
  nivelRiesgoLAFT: 'Bajo',
  esPEP: false,
  tieneAntecedentes: false,
  idTipoAntecedente: null,
  resultadoEvaluacion: 'Aprobado',
  observaciones: 'Evaluación inicial satisfactoria.',
  esVigente: true,
  vigenteHasta: '2027-11-01',
  idSolicitud: null,
}

describe('GestionRiesgo', () => {
  it('muestra la evaluación vigente con validez "Vigente hasta dd/mm/aaaa"', () => {
    mockQueryState.data = [{ ...evaluacionBase, vigenteHasta: '2027-12-31' }]
    const html = renderToStaticMarkup(<GestionRiesgo id={42} nombre="Ana Torres" />)

    expect(html).toContain('Aprobado')
    expect(html).toContain('Riesgo LAFT Bajo')
    expect(html).toContain('Vigente hasta 31/12/2027')
  })

  it('muestra "Vencida" cuando la fecha de vigencia ya pasó', () => {
    mockQueryState.data = [{ ...evaluacionBase, vigenteHasta: '2020-01-15' }]
    const html = renderToStaticMarkup(<GestionRiesgo id={42} nombre="Ana Torres" />)

    expect(html).toContain('Vencida')
    expect(html).not.toContain('Vigente hasta')
  })

  it('muestra mensaje cuando el cliente carece de evaluación vigente', () => {
    mockQueryState.data = [{ ...evaluacionBase, esVigente: false }]
    const html = renderToStaticMarkup(<GestionRiesgo id={42} nombre="Ana Torres" />)

    expect(html).toContain('El cliente carece de una evaluación vigente.')
  })

  it('en el historial incluye la columna "Vigente hasta" y el enlace a la solicitud cuando idSolicitud existe', () => {
    mockQueryState.data = [
      {
        ...evaluacionBase,
        idEvaluacion: 202,
        nivelRiesgoLAFT: 'Alto',
        vigenteHasta: '2027-06-15',
        idSolicitud: 789,
      },
    ]
    const html = renderToStaticMarkup(<GestionRiesgo id={42} nombre="Ana Torres" mostrarHistorialInicial />)

    expect(html).toContain('Vigente hasta')
    expect(html).toContain('15/06/2027')
    expect(html).toContain('Aprobada en la solicitud #789')
    expect(html).toContain('href="/aprobaciones/789"')
  })

  it('en el historial sin solicitud no muestra enlace de aprobación', () => {
    mockQueryState.data = [
      {
        ...evaluacionBase,
        idEvaluacion: 203,
        idSolicitud: null,
        vigenteHasta: null,
      },
    ]
    const html = renderToStaticMarkup(<GestionRiesgo id={42} nombre="Ana Torres" mostrarHistorialInicial />)

    expect(html).toContain('Vigente hasta')
    expect(html).toContain('—')
    expect(html).not.toContain('Aprobada en la solicitud #')
  })
})
