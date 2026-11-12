import { describe, expect, it } from 'vitest'
import { direccionCambioSchema, direccionGestionSchema, direccionNuevaSchema } from '@/features/clientes/api/direcciones.contract'
import { accionesDireccion, cambiosDireccion, direccionFormSchema, payloadDireccion, puedeGestionarDirecciones, valoresDireccion } from '@/features/clientes/lib/direcciones'

const direccion = {
  idDireccion: 1, tipoDireccion: 'Domicilio' as const, codigoPais: 'ECU', idCiudad: 1,
  sector: null, calleDireccion: 'Calle de prueba 123', referenciaUbicacion: 'Frente al parque',
  codigoPostal: null, esPrincipal: true, estado: 'Activo' as const,
}

describe('C-07 contrato y decisiones de gestión', () => {
  it.each(['ADMIN', 'asesor', ' ASESOR '])('permite gestionar con %s', (rol) => expect(puedeGestionarDirecciones([rol])).toBe(true))
  it.each(['CAJERO', 'SUPERVISOR', 'AUDITOR', 'cliente'])('no amplía permisos de %s', (rol) => expect(puedeGestionarDirecciones([rol])).toBe(false))
  it('no concede permisos sin roles', () => expect(puedeGestionarDirecciones([])).toBe(false))
  it('conserva país, ciudad y estado necesarios para editar', () => expect(direccionGestionSchema.parse(direccion)).toEqual(direccion))
  it('convierte la ciudad a número y vacíos opcionales a null sin campos UI', () => {
    const form = direccionFormSchema.parse({ ...valoresDireccion(direccion), calleDireccion: '  Nueva calle 9  ' })
    const body = payloadDireccion(form)
    expect(body.calleDireccion).toBe('Nueva calle 9')
    expect(body.idCiudad).toBe(1)
    expect(body.codigoPostal).toBeNull()
    expect(body).not.toHaveProperty('provincia')
    expect(direccionNuevaSchema.parse(body)).toEqual(body)
  })
  it('envía solo cambios y permite vaciar un campo opcional', () => {
    const original = { ...direccion, sector: 'Centro' }
    expect(cambiosDireccion(original, payloadDireccion(valoresDireccion(direccion)))).toEqual({ sector: null })
    expect(cambiosDireccion(direccion, payloadDireccion(valoresDireccion(direccion)))).toEqual({})
  })
  it('rechaza un PATCH vacío o campos protegidos', () => {
    expect(direccionCambioSchema.safeParse({}).success).toBe(false)
    expect(direccionCambioSchema.safeParse({ estado: 'Activo' }).success).toBe(false)
  })
  it.each(['DOMICILIO', 'Negocio', 'NEGOCIO'])('no copia el valor incompatible %s del wizard', (tipoDireccion) => {
    expect(direccionNuevaSchema.safeParse({ ...payloadDireccion(valoresDireccion(direccion)), tipoDireccion }).success).toBe(false)
  })
  it.each(['', '123456'])('acepta código postal opcional según contrato: %s', (codigoPostal) => {
    expect(direccionFormSchema.safeParse({ ...valoresDireccion(direccion), codigoPostal }).success).toBe(true)
  })
  it.each(['12345', '1234567', 'ABC123'])('rechaza código postal fuera del contrato: %s', (codigoPostal) => {
    expect(direccionFormSchema.safeParse({ ...valoresDireccion(direccion), codigoPostal }).success).toBe(false)
  })
  it('protege la principal e impide promover o modificar inactivas', () => {
    expect(accionesDireccion(direccion)).toEqual({ editar: true, principal: false, baja: false })
    expect(accionesDireccion({ ...direccion, esPrincipal: false })).toEqual({ editar: true, principal: true, baja: true })
    expect(accionesDireccion({ ...direccion, estado: 'Inactivo' })).toEqual({ editar: false, principal: false, baja: false })
  })
})
