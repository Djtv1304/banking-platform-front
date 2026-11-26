import { describe, expect, it } from 'vitest'
import { etiquetaContable, etiquetaOrigenCuenta } from '@/features/contabilidad/lib/etiquetas'

describe('etiquetas de contabilidad', () => {
  it('prioriza la descripción del catálogo y reconoce un nombre técnico', () => {
    const codigo = 'CUENTAS_INTERES_DEVENGO'
    expect(etiquetaContable(codigo, 'Interés diario de depósitos')).toBe('Interés diario de depósitos')
    expect(etiquetaContable(codigo, codigo)).toBe('Devengo de interés ordinario de depósitos')
  })

  it('distingue la comisión como componente y como origen de cuenta', () => {
    expect(etiquetaContable('COMISION')).toBe('Comisión')
    expect(etiquetaOrigenCuenta('COMISION')).toBe('Cuenta de comisión')
  })

  it('presenta identificadores nuevos con palabras separadas', () => {
    expect(etiquetaContable('AJUSTE_X_NUEVO')).toBe('Ajuste x nuevo')
    expect(etiquetaContable('OrigenNuevo')).toBe('Origen nuevo')
  })
})
