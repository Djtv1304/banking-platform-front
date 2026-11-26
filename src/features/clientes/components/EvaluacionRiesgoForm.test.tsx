import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { EvaluacionRiesgoForm } from '@/features/clientes/components/EvaluacionRiesgoForm'

vi.mock('@/shared/theme', () => ({ useThemeStore: vi.fn() }))
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: [], isPending: false, isError: false }),
}))

describe('EvaluacionRiesgoForm', () => {
  it('muestra "Registrar evaluación" y sin aviso de aprobación para evaluación ordinaria (Bajo, no PEP, Aprobado)', () => {
    const html = renderToStaticMarkup(
      <EvaluacionRiesgoForm
        nombre="Juan Pérez"
        ocupado={false}
        error={null}
        guardar={vi.fn()}
        cancelar={vi.fn()}
        valoresIniciales={{ nivelRiesgoLAFT: 'Bajo', esPEP: false, resultadoEvaluacion: 'Aprobado' }}
      />
    )
    expect(html).toContain('Registrar evaluación')
    expect(html).not.toContain('Enviar a aprobación')
    expect(html).not.toContain('Esta evaluación requiere la aprobación de otra persona y no rige hasta entonces.')
    expect(html).not.toContain('Si se aprueba, el cliente quedará bloqueado.')
  })

  it('muestra aviso de aprobación y botón "Enviar a aprobación" cuando es PEP', () => {
    const html = renderToStaticMarkup(
      <EvaluacionRiesgoForm
        nombre="Juan Pérez"
        ocupado={false}
        error={null}
        guardar={vi.fn()}
        cancelar={vi.fn()}
        valoresIniciales={{ nivelRiesgoLAFT: 'Bajo', esPEP: true, resultadoEvaluacion: 'Aprobado' }}
      />
    )
    expect(html).toContain('Enviar a aprobación')
    expect(html).not.toContain('Registrar evaluación')
    expect(html).toContain('Esta evaluación requiere la aprobación de otra persona y no rige hasta entonces.')
    expect(html).not.toContain('Si se aprueba, el cliente quedará bloqueado.')
  })

  it('muestra aviso de aprobación y botón "Enviar a aprobación" cuando el nivel es Alto', () => {
    const html = renderToStaticMarkup(
      <EvaluacionRiesgoForm
        nombre="Juan Pérez"
        ocupado={false}
        error={null}
        guardar={vi.fn()}
        cancelar={vi.fn()}
        valoresIniciales={{ nivelRiesgoLAFT: 'Alto', esPEP: false, resultadoEvaluacion: 'Aprobado' }}
      />
    )
    expect(html).toContain('Enviar a aprobación')
    expect(html).not.toContain('Registrar evaluación')
    expect(html).toContain('Esta evaluación requiere la aprobación de otra persona y no rige hasta entonces.')
    expect(html).not.toContain('Si se aprueba, el cliente quedará bloqueado.')
  })

  it('muestra advertencia de bloqueo cuando el resultado es Rechazado', () => {
    const html = renderToStaticMarkup(
      <EvaluacionRiesgoForm
        nombre="Juan Pérez"
        ocupado={false}
        error={null}
        guardar={vi.fn()}
        cancelar={vi.fn()}
        valoresIniciales={{ nivelRiesgoLAFT: 'Medio', esPEP: false, resultadoEvaluacion: 'Rechazado' }}
      />
    )
    expect(html).toContain('Enviar a aprobación')
    expect(html).not.toContain('Registrar evaluación')
    expect(html).toContain('Esta evaluación requiere la aprobación de otra persona y no rige hasta entonces.')
    expect(html).toContain('Si se aprueba, el cliente quedará bloqueado.')
  })
})
