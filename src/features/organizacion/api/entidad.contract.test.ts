import { describe, expect, it } from 'vitest'

import { ENTIDAD_ENDPOINT, entidadSchema } from '@/features/organizacion/api/entidad.contract'

const entidad = {
  idEntidad: 1,
  ruc: '1790012345001',
  razonSocial: 'Cooperativa Enquo',
  nombreComercial: null,
  tipoOrganizacion: 'Cooperativa de ahorro y crédito',
  segmento: 3,
  numeroResolucionSeps: null,
  fechaConstitucion: '2010-05-20',
  representanteLegal: 'Ana Pérez',
  identificacionRepresentante: '1712345675',
  telefono: null,
  email: 'info@enquo.test',
  sitioWeb: null,
  estado: 'A',
  fechaRegistro: '2026-11-01T10:30:00',
  modificadoPor: 7,
}

describe('ENTIDAD_ENDPOINT', () => {
  it('apunta a la ruta real del backend (montada bajo /agencias) y es relativa', () => {
    expect(ENTIDAD_ENDPOINT).toBe('/api/v1/agencias/organizacion/entidad')
  })
})

describe('entidadSchema', () => {
  it('acepta la entidad con los anulables en null', () => {
    expect(entidadSchema.safeParse(entidad).success).toBe(true)
  })

  it('acepta segmento y textos opcionales con valor', () => {
    const completa = { ...entidad, segmento: 5, nombreComercial: 'Enquo', telefono: '022345678' }
    expect(entidadSchema.parse(completa)).toMatchObject({ segmento: 5, nombreComercial: 'Enquo' })
  })

  it('rechaza un estado que no es A ni I', () => {
    expect(entidadSchema.safeParse({ ...entidad, estado: 'ACTIVA' }).success).toBe(false)
  })

  it('rechaza una respuesta sin campos obligatorios (p. ej. HTML)', () => {
    expect(entidadSchema.safeParse({ ...entidad, razonSocial: undefined }).success).toBe(false)
    expect(entidadSchema.safeParse('<html></html>').success).toBe(false)
  })
})
