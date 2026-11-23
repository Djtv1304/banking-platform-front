import { beforeEach, describe, expect, it } from 'vitest'

import {
  marcarReversoSolicitado,
  olvidarReversosSolicitados,
  reversoFueSolicitado,
} from '@/features/contabilidad/store/reversos-solicitados.store'

beforeEach(() => olvidarReversosSolicitados())

describe('reversos solicitados', () => {
  it('recuerda sólo los asientos marcados', () => {
    marcarReversoSolicitado(7)
    expect(reversoFueSolicitado(7)).toBe(true)
    expect(reversoFueSolicitado(8)).toBe(false)
  })

  it('olvidar los borra todos', () => {
    marcarReversoSolicitado(7)
    olvidarReversosSolicitados()
    expect(reversoFueSolicitado(7)).toBe(false)
  })
})
