import { describe, expect, it } from 'vitest'

import type { Entidad } from '@/features/organizacion/api/entidad.contract'
import {
  cambiosEntidad,
  entidadFormSchema,
  esFechaValida,
  hayCambios,
  valoresEntidad,
  type EntidadFormInput,
} from '@/features/organizacion/lib/entidad'

const entidad: Entidad = {
  idEntidad: 1,
  ruc: '1790012345001',
  razonSocial: 'Cooperativa Enquo',
  nombreComercial: 'Enquo',
  tipoOrganizacion: 'Cooperativa de ahorro y crédito',
  segmento: 3,
  numeroResolucionSeps: 'SEPS-2010-001',
  fechaConstitucion: '2010-05-20',
  representanteLegal: 'Ana Pérez',
  identificacionRepresentante: '1712345675',
  telefono: '022345678',
  email: 'info@enquo.test',
  sitioWeb: 'https://enquo.test',
  estado: 'A',
  fechaRegistro: '2026-11-01T10:30:00',
  modificadoPor: 7,
}

const sinOpcionales: Entidad = {
  ...entidad,
  nombreComercial: null,
  segmento: null,
  numeroResolucionSeps: null,
  telefono: null,
  email: null,
  sitioWeb: null,
}

const parsear = (cambios: Partial<EntidadFormInput> = {}, base: Entidad = entidad) =>
  entidadFormSchema.safeParse({ ...valoresEntidad(base), ...cambios })

const mensaje = (cambios: Partial<EntidadFormInput>) => {
  const resultado = parsear(cambios)
  return resultado.success ? null : resultado.error.issues[0]?.message
}

/** Pasa por el esquema, como en el formulario, y arma el body */
const cambios = (nuevos: Partial<EntidadFormInput>, base: Entidad = entidad) => {
  const resultado = parsear(nuevos, base)
  if (!resultado.success) throw new Error(resultado.error.message)
  return cambiosEntidad(base, resultado.data)
}

describe('valoresEntidad', () => {
  it('los null pasan a texto vacío y el segmento a texto', () => {
    expect(valoresEntidad(sinOpcionales)).toMatchObject({ nombreComercial: '', segmento: '', telefono: '', email: '' })
    expect(valoresEntidad(entidad).segmento).toBe('3')
  })
})

describe('entidadFormSchema', () => {
  it('acepta la entidad tal como está registrada, con o sin opcionales', () => {
    expect(parsear().success).toBe(true)
    expect(parsear({}, sinOpcionales).success).toBe(true)
  })

  it('el RUC son 10 dígitos más 001', () => {
    expect(mensaje({ ruc: '1790012345002' })).toMatch(/RUC/)
    expect(mensaje({ ruc: '179001234500' })).toMatch(/RUC/)
    expect(mensaje({ ruc: '17900123450AB' })).toMatch(/RUC/)
    expect(mensaje({ ruc: '1790012345001' })).toBeNull()
  })

  it('razón social, tipo y representante son obligatorios y respetan el máximo', () => {
    expect(mensaje({ razonSocial: '   ' })).toMatch(/razón social/)
    expect(mensaje({ razonSocial: 'a'.repeat(251) })).toMatch(/250/)
    expect(mensaje({ tipoOrganizacion: '' })).toMatch(/tipo/)
    expect(mensaje({ tipoOrganizacion: 'a'.repeat(61) })).toMatch(/60/)
    expect(mensaje({ representanteLegal: '' })).toMatch(/representante/)
    expect(mensaje({ representanteLegal: 'a'.repeat(251) })).toMatch(/250/)
  })

  it('los opcionales pueden ir vacíos pero no pasan de su máximo', () => {
    expect(mensaje({ nombreComercial: '', numeroResolucionSeps: '', telefono: '', email: '', sitioWeb: '' })).toBeNull()
    expect(mensaje({ nombreComercial: 'a'.repeat(151) })).toMatch(/150/)
    expect(mensaje({ numeroResolucionSeps: 'a'.repeat(61) })).toMatch(/60/)
    expect(mensaje({ telefono: '1'.repeat(16) })).toMatch(/15/)
    expect(mensaje({ sitioWeb: 'a'.repeat(151) })).toMatch(/150/)
  })

  it('el correo, si se escribe, tiene formato de correo y máximo 150', () => {
    expect(mensaje({ email: 'no-es-correo' })).toMatch(/correo/)
    expect(mensaje({ email: `${'a'.repeat(150)}@enquo.test` })).toMatch(/150/)
    expect(mensaje({ email: 'info@enquo.test' })).toBeNull()
  })

  it('el segmento es de 1 a 5 o vacío', () => {
    expect(mensaje({ segmento: '0' })).toMatch(/segmento/)
    expect(mensaje({ segmento: '6' })).toMatch(/segmento/)
    expect(mensaje({ segmento: '5' })).toBeNull()
    expect(mensaje({ segmento: '' })).toBeNull()
  })

  it('la fecha de constitución es un día real', () => {
    expect(mensaje({ fechaConstitucion: '' })).toMatch(/fecha/)
    expect(mensaje({ fechaConstitucion: '2026-02-31' })).toMatch(/fecha/)
    expect(mensaje({ fechaConstitucion: '20/05/2010' })).toMatch(/fecha/)
    expect(mensaje({ fechaConstitucion: '2010-05-20' })).toBeNull()
  })

  it('la identificación del representante son 5 a 13 números o letras, y se pasa a mayúsculas', () => {
    expect(mensaje({ identificacionRepresentante: '1234' })).toMatch(/5 a 13/)
    expect(mensaje({ identificacionRepresentante: '12345678901234' })).toMatch(/5 a 13/)
    expect(mensaje({ identificacionRepresentante: 'AB-1234' })).toMatch(/5 a 13/)
    const resultado = parsear({ identificacionRepresentante: ' ab12345 ' })
    expect(resultado.success && resultado.data.identificacionRepresentante).toBe('AB12345')
  })

  it('el estado es A o I', () => {
    expect(mensaje({ estado: 'X' as never })).toMatch(/estado/)
    expect(mensaje({ estado: 'I' })).toBeNull()
  })
})

describe('esFechaValida', () => {
  it('rechaza días que no existen', () => {
    expect(esFechaValida('2024-02-29')).toBe(true)
    expect(esFechaValida('2026-02-29')).toBe(false)
    expect(esFechaValida('2026-13-01')).toBe(false)
  })
})

describe('cambiosEntidad', () => {
  it('sin tocar nada no hay cambios', () => {
    expect(cambios({})).toEqual({})
    expect(hayCambios(cambios({}))).toBe(false)
  })

  it('envía solo los campos que cambiaron', () => {
    expect(cambios({ razonSocial: 'Cooperativa Enquo Ltda.', telefono: '022999999' })).toEqual({
      razonSocial: 'Cooperativa Enquo Ltda.',
      telefono: '022999999',
    })
  })

  it('no cuenta como cambio un espacio sobrante', () => {
    expect(cambios({ razonSocial: '  Cooperativa Enquo  ' })).toEqual({})
  })

  it('un anulable vaciado se envía como null', () => {
    expect(
      cambios({ nombreComercial: '', segmento: '', numeroResolucionSeps: ' ', telefono: '', email: '', sitioWeb: '' }),
    ).toEqual({
      nombreComercial: null,
      segmento: null,
      numeroResolucionSeps: null,
      telefono: null,
      email: null,
      sitioWeb: null,
    })
  })

  it('un anulable que ya era null y sigue vacío no se envía', () => {
    expect(cambios({ nombreComercial: '', segmento: '' }, sinOpcionales)).toEqual({})
  })

  it('un anulable que era null y se llena se envía con su valor; el segmento como número', () => {
    expect(cambios({ nombreComercial: 'Enquo', segmento: '2', email: 'a@enquo.test' }, sinOpcionales)).toEqual({
      nombreComercial: 'Enquo',
      segmento: 2,
      email: 'a@enquo.test',
    })
  })

  it('los obligatorios nunca van como null y el estado cambia a I', () => {
    const body = cambios({ estado: 'I', ruc: '0990012345001', identificacionRepresentante: 'ab12345' })
    expect(body).toEqual({ estado: 'I', ruc: '0990012345001', identificacionRepresentante: 'AB12345' })
    expect(Object.values(body)).not.toContain(null)
  })

  it('no envía campos de solo lectura', () => {
    const body = cambios({ razonSocial: 'Otra' })
    expect(Object.keys(body)).not.toContain('idEntidad')
    expect(Object.keys(body)).not.toContain('fechaRegistro')
    expect(Object.keys(body)).not.toContain('modificadoPor')
  })
})
