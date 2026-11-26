import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { RiesgoCreate } from '@/features/clientes/api/riesgo'
import { EvaluacionRiesgoForm } from '@/features/clientes/components/EvaluacionRiesgoForm'

vi.mock('@/shared/theme', () => ({ useThemeStore: vi.fn() }))
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: [], isPending: false, isError: false }),
}))

const AVISO = 'Esta evaluación requiere la aprobación de otra persona y no rige hasta entonces.'
const BLOQUEO = 'Si se aprueba, el cliente quedará bloqueado.'

const render = (valoresIniciales: Partial<RiesgoCreate>) =>
  renderToStaticMarkup(
    <EvaluacionRiesgoForm nombre="Juan Pérez" ocupado={false} error={null} guardar={vi.fn()} cancelar={vi.fn()}
      valoresIniciales={valoresIniciales} />,
  )

describe('EvaluacionRiesgoForm · aviso de aprobación (E5-06)', () => {
  it.each([
    ['ordinaria', { nivelRiesgoLAFT: 'Bajo', esPEP: false, resultadoEvaluacion: 'Aprobado' }, false, false],
    ['PEP', { nivelRiesgoLAFT: 'Bajo', esPEP: true, resultadoEvaluacion: 'Aprobado' }, true, false],
    ['nivel Alto', { nivelRiesgoLAFT: 'Alto', esPEP: false, resultadoEvaluacion: 'Aprobado' }, true, false],
    ['Rechazado', { nivelRiesgoLAFT: 'Medio', esPEP: false, resultadoEvaluacion: 'Rechazado' }, true, true],
  ] as const)('evaluación %s', (_caso, valores, requiere, bloquea) => {
    const html = render(valores)
    expect(html.includes('Enviar a aprobación')).toBe(requiere)
    expect(html.includes('Registrar evaluación')).toBe(!requiere)
    expect(html.includes(AVISO)).toBe(requiere)
    expect(html.includes(BLOQUEO)).toBe(bloquea)
  })
})
