import { describe, expect, it } from 'vitest'

import { cuentaAdmiteTarjeta } from '@/features/tarjetas/lib/formulario'

describe('cuentaAdmiteTarjeta', () => {
  it('acepta la cuenta activa tal como la devuelve el backend', () => {
    expect(cuentaAdmiteTarjeta('ACTIVA')).toBe(true)
  })

  it('no distingue mayúsculas', () => {
    expect(cuentaAdmiteTarjeta('Activa')).toBe(true)
  })

  it.each(['INACTIVA', 'BLOQUEADA', 'CERRADA', ''])('rechaza %s', (estado) => {
    expect(cuentaAdmiteTarjeta(estado)).toBe(false)
  })
})
