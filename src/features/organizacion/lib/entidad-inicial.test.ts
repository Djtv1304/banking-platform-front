import { describe, expect, it } from 'vitest'
import { entidadFormSchema, valoresEntidadInicial } from '@/features/organizacion/lib/entidad-form'

describe('Borrador de configuración inicial de la cooperativa', () => {
  it('empieza vacío, sin asignar datos institucionales ni identificadores administrados por backend', () => {
    const borrador = valoresEntidadInicial()
    expect(borrador.tipoOrganizacion).toBe('Cooperativa de Ahorro y Credito')
    expect(Object.entries(borrador).filter(([key]) => key !== 'tipoOrganizacion').every(([, valor]) => valor === '')).toBe(true)
    expect(borrador).not.toHaveProperty('idEntidad')
    expect(borrador).not.toHaveProperty('modificadoPor')
    expect(borrador).not.toHaveProperty('estado')
    expect(entidadFormSchema.safeParse(borrador).success).toBe(false)
  })

  it('un borrador nuevo no hereda los valores de otro formulario', () => {
    const anterior = valoresEntidadInicial()
    anterior.razonSocial = 'Borrador anterior'
    expect(valoresEntidadInicial().razonSocial).toBe('')
  })
})
