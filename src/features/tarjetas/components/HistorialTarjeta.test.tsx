import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { TarjetaHistorial } from '@/features/tarjetas/api/tarjetas.contract'
import { TablaHistorial } from '@/features/tarjetas/components/HistorialTarjeta'

vi.mock('@/features/tarjetas/hooks/useAccionesTarjeta', () => ({ useHistorialTarjeta: vi.fn() }))
vi.mock('@/shared/ui', () => ({}))

const eventos: TarjetaHistorial[] = [
  {
    idHistorial: 2,
    idTarjeta: 7,
    tipoEvento: 'CambioPin',
    resultado: 'COMPLETADO',
    origen: 'Regeneracion',
    fechaCambio: '2026-11-17T10:20:00-05:00',
    realizadoPor: 42,
  },
  {
    idHistorial: 1,
    idTarjeta: 7,
    tipoEvento: 'Bloqueo',
    estadoAnterior: 'Activa',
    estadoNuevo: 'Bloqueada',
    motivo: 'Robo: reportado en agencia',
    fechaCambio: '2026-11-17T10:15:00-05:00',
    realizadoPor: 42,
  },
]

describe('TablaHistorial', () => {
  const salida = renderToStaticMarkup(<TablaHistorial items={eventos} />)

  it('muestra fecha y hora de Ecuador, evento y quién lo hizo', () => {
    expect(salida).toContain('17 de noviembre de 2026')
    expect(salida).toContain('10:20')
    expect(salida).toContain('Cambio de PIN')
    expect(salida).toContain('ID 42')
  })

  it('un bloqueo muestra el cambio de estado y su motivo', () => {
    expect(salida).toContain('Activa')
    expect(salida).toContain('Bloqueada')
    expect(salida).toContain('Robo: reportado en agencia')
  })

  it('un cambio de PIN muestra resultado y origen', () => {
    expect(salida).toContain('Completado')
    expect(salida).toContain('Regeneración')
  })
})
