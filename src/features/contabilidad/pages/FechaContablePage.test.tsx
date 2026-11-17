import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/shared/api'
import type { FechaContable } from '@/features/contabilidad/api/fecha-contable.contract'
import { FechaContablePage } from '@/features/contabilidad/pages/FechaContablePage'

const fecha = (iso: string, extra: Partial<FechaContable> = {}): FechaContable => ({
  idFechaContable: 1,
  fecha: iso,
  esDiaContable: true,
  esFeriado: false,
  esFinDeSemana: false,
  horaCorte: '19:00:00',
  ...extra,
})

const estado = vi.hoisted(() => ({
  actual: {} as Record<string, unknown>,
  proximas: [] as Record<string, unknown>[],
  pedidas: [] as readonly string[],
}))

vi.mock('@/features/contabilidad/hooks/useFechaContable', () => ({
  useFechaContableActual: () => estado.actual,
  useFechasContables: (fechas: readonly string[]) => {
    estado.pedidas = fechas
    return estado.proximas
  },
}))

/* El barril de shared/ui arrastra el store del tema (usa `window`): se importan solo las piezas */
vi.mock('@/shared/ui', async () => ({
  Aviso: (await import('@/shared/ui/aviso')).Aviso,
  Cargando: (await import('@/shared/ui/aviso')).Cargando,
  Badge: (await import('@/shared/ui/badge')).Badge,
  Button: (await import('@/shared/ui/button')).Button,
}))

const ok = (data: FechaContable) => ({ isPending: false, isError: false, data })
const html = () => renderToStaticMarkup(<FechaContablePage />)

beforeEach(() => {
  estado.actual = ok(fecha('2026-11-17'))
  estado.proximas = [
    ok(fecha('2026-11-18')),
    ok(fecha('2026-11-19')),
    ok(fecha('2026-11-20', { esDiaContable: false, esFeriado: true })),
    ok(fecha('2026-11-21', { esDiaContable: false, esFinDeSemana: true })),
    ok(fecha('2026-11-22', { esDiaContable: false, esFinDeSemana: true })),
    { isPending: false, isError: true, error: new ApiError('No existe', 404, 'FECHA_NO_ENCONTRADA') },
    { isPending: false, isError: true, error: new ApiError('Falló', 500, 'ERROR') },
  ]
})

describe('FechaContablePage', () => {
  it('muestra la fecha vigente en español, su estado, la hora de corte y la regla', () => {
    const salida = html()
    expect(salida).toContain('<h1')
    expect(salida).toContain('Fecha contable')
    expect(salida).toContain('martes, 17 de noviembre de 2026')
    expect(salida).toContain('Día contable')
    expect(salida).toContain('19:00')
    expect(salida).toContain('Lo que se registre después de las 19:00 se fecha el siguiente día hábil.')
  })

  it('pide los 7 días calendario que siguen a la vigente', () => {
    html()
    expect(estado.pedidas).toEqual([
      '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24',
    ])
  })

  it('en próximos días distingue hábil, feriado, fin de semana y sin calendario', () => {
    const salida = html()
    expect(salida).toContain('Próximos días')
    expect(salida).toContain('mié, 18 nov')
    expect(salida).toContain('Hábil')
    expect(salida).toContain('Feriado')
    expect(salida).toContain('Fin de semana')
    expect(salida).toContain('Sin calendario')
    expect(salida).toContain('No se pudo consultar')
  })

  it('con 200 que cruza de año calcula bien la tira', () => {
    estado.actual = ok(fecha('2026-12-29'))
    html()
    expect(estado.pedidas.slice(2)).toEqual(['2027-01-01', '2027-01-02', '2027-01-03', '2027-01-04', '2027-01-05'])
  })

  it('mientras carga, avisa y no muestra la tarjeta', () => {
    estado.actual = { isPending: true, isError: false }
    const salida = html()
    expect(salida).toContain('Consultando la fecha contable…')
    expect(salida).not.toContain('Fecha contable vigente')
  })

  it('si falla, muestra el error con Reintentar', () => {
    estado.actual = { isPending: false, isError: true, error: new ApiError('Servicio caído', 500, 'ERROR'), refetch: vi.fn() }
    const salida = html()
    expect(salida).toContain('role="alert"')
    expect(salida).toContain('Servicio caído')
    expect(salida).toContain('Reintentar')
  })

  it('la fecha vigente que no es día contable se marca como No contable', () => {
    estado.actual = ok(fecha('2026-11-20', { esDiaContable: false, esFeriado: true }))
    const salida = html()
    expect(salida).toContain('viernes, 20 de noviembre de 2026')
    expect(salida).toContain('No contable')
  })
})
