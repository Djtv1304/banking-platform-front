import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/shared/api'
import type { FechaContable } from '@/features/contabilidad/api/fecha-contable.contract'
import { ResultadoConsultaFecha, type ConsultaFecha } from '@/features/contabilidad/components/ResultadoConsultaFecha'

/* El barril de shared/ui arrastra el store del tema (usa `window`): se importan solo las piezas */
vi.mock('@/shared/ui', async () => ({
  Aviso: (await import('@/shared/ui/aviso')).Aviso,
  Cargando: (await import('@/shared/ui/aviso')).Cargando,
  Badge: (await import('@/shared/ui/badge')).Badge,
  Button: (await import('@/shared/ui/button')).Button,
}))

const FERIADO: FechaContable = {
  idFechaContable: 9,
  fecha: '2026-11-20',
  esDiaContable: false,
  esFeriado: true,
  esFinDeSemana: false,
  horaCorte: '19:00:00',
}

const html = (consulta: Partial<ConsultaFecha>) =>
  renderToStaticMarkup(<ResultadoConsultaFecha consulta={{ isPending: false, isError: false, refetch: vi.fn(), ...consulta }} />)

describe('ResultadoConsultaFecha', () => {
  it('200: muestra la fecha, el estado, el tipo de día y la hora de corte', () => {
    const salida = html({ data: FERIADO })
    expect(salida).toContain('viernes, 20 de noviembre de 2026')
    expect(salida).toContain('No contable')
    expect(salida).toContain('Feriado')
    expect(salida).toContain('19:00')
  })

  it('404: explica que la fecha no está en el calendario, sin botón de reintento', () => {
    const salida = html({ isError: true, error: new ApiError('No existe', 404, 'CALENDARIO_SIN_FECHA') })
    expect(salida).toContain('Esa fecha no está en el calendario contable: no se puede operar en ella hasta generarlo.')
    expect(salida).not.toContain('role="alert"')
    expect(salida).not.toContain('Reintentar')
  })

  it('400: no pinta nada aquí (el error va junto al campo)', () => {
    expect(html({ isError: true, error: new ApiError('Fecha mal', 400, 'FECHA_INVALIDA') })).toBe('')
  })

  it('otro error: aviso de error con Reintentar', () => {
    const salida = html({ isError: true, error: new ApiError('Servicio caído', 500, 'ERROR') })
    expect(salida).toContain('role="alert"')
    expect(salida).toContain('Servicio caído')
    expect(salida).toContain('Reintentar')
  })

  it('cargando: avisa', () => {
    expect(html({ isPending: true })).toContain('Consultando la fecha…')
  })
})
