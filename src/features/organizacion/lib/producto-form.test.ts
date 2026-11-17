import { describe, expect, it } from 'vitest'

import { ApiError } from '@/shared/api'
import type { ProductoAdmin } from '@/features/organizacion/api/productos.contract'
import {
  filtrarProductos,
  agruparPorTipo,
  mensajeErrorProducto,
  payloadCrear,
  payloadEdicion,
  productoFormSchema,
  subProductoFormSchema,
  VALORES_NUEVO,
} from '@/features/organizacion/lib/producto-form'

const cuenta = { ...VALORES_NUEVO, codigoProducto: 'aho002', nombreProducto: 'Ahorro programado', tipoProducto: 'Cuenta', tipoCuenta: 'Ahorro', montoAperturaMinimo: '10.50' }

describe('formulario de producto', () => {
  it('Cuenta: arma solo los campos de cuenta, con el código en mayúsculas', () => {
    const datos = productoFormSchema.parse({ ...cuenta, idRed: '2' })
    expect(payloadCrear(datos)).toEqual({
      codigoProducto: 'AHO002',
      nombreProducto: 'Ahorro programado',
      tipoProducto: 'Cuenta',
      tipoCuenta: 'Ahorro',
      montoAperturaMinimo: 10.5,
      permiteOperacionesPresenciales: true,
    })
  })

  it('exige lo propio de cada tipo', () => {
    expect(productoFormSchema.safeParse({ ...cuenta, tipoCuenta: '' }).success).toBe(false)
    expect(productoFormSchema.safeParse({ ...cuenta, tipoProducto: 'Credito' }).success).toBe(false)
    expect(productoFormSchema.safeParse({ ...cuenta, tipoProducto: 'Tarjeta' }).success).toBe(false)
    const tarjeta = productoFormSchema.parse({ ...cuenta, tipoProducto: 'Tarjeta', idRed: '2' })
    expect(payloadCrear(tarjeta)).toMatchObject({ tipoProducto: 'Tarjeta', idRed: 2 })
    expect(payloadCrear(tarjeta)).not.toHaveProperty('tipoCuenta')
  })

  it('rechaza códigos y montos inválidos', () => {
    expect(productoFormSchema.safeParse({ ...cuenta, codigoProducto: 'A$' }).success).toBe(false)
    expect(productoFormSchema.safeParse({ ...cuenta, montoAperturaMinimo: '1,5' }).success).toBe(false)
  })

  it('la edición envía solo lo que cambió y null al vaciar la descripción', () => {
    const inicial = { ...cuenta, codigoProducto: 'AHO002', descripcion: 'Antes', montoAperturaMinimo: '10.5' }
    const datos = productoFormSchema.parse({ ...inicial, descripcion: '' })
    expect(payloadEdicion(inicial, datos)).toEqual({ descripcion: null })
    expect(payloadEdicion(inicial, productoFormSchema.parse(inicial))).toEqual({})
  })
})

describe('formulario de subproducto', () => {
  it('en tarjetas exige el prefijo TDB o TCR', () => {
    const esquema = subProductoFormSchema('Tarjeta')
    expect(esquema.safeParse({ codigoSubProducto: 'xyz-mc', nombreSubProducto: 'Sin prefijo' }).success).toBe(false)
    expect(esquema.parse({ codigoSubProducto: 'tdb002-vs', nombreSubProducto: 'Débito Visa' }).codigoSubProducto).toBe('TDB002-VS')
  })

  it('en cuentas acepta cualquier código válido', () => {
    expect(subProductoFormSchema('Cuenta').safeParse({ codigoSubProducto: 'AHO002-PN', nombreSubProducto: 'Natural' }).success).toBe(true)
  })
})

it('traduce los errores del backend', () => {
  expect(mensajeErrorProducto(new ApiError('x', 409, 'PRODUCTO_SIN_SUBPRODUCTOS'))).toContain('al menos un subproducto')
  expect(mensajeErrorProducto(new ApiError('x', 403, 'SIN_PERMISO'))).toContain('permiso')
})

it('el buscador ignora tildes y mayúsculas y busca también en subproductos', () => {
  const p = (codigo: string, nombre: string, sub: string): ProductoAdmin => ({
    idProducto: 1,
    codigoProducto: codigo,
    nombreProducto: nombre,
    tipoProducto: 'Credito' as const,
    permiteOperacionesPresenciales: true,
    estado: 'A' as const,
    subproductos: [{ idSubProducto: 1, idProducto: 1, codigoSubProducto: `${codigo}-1`, nombreSubProducto: sub, estado: 'A' as const, fechaRegistro: '' }],
  })
  const productos = [p('CRE001', 'Crédito de consumo', 'Hasta 10000'), p('CRE002', 'Microcrédito', 'Emprendedor')]
  expect(filtrarProductos(productos, 'CREDITO DE').map((x) => x.codigoProducto)).toEqual(['CRE001'])
  expect(filtrarProductos(productos, 'emprend').map((x) => x.codigoProducto)).toEqual(['CRE002'])
  expect(filtrarProductos(productos, '  ')).toHaveLength(2)
})


describe('E3-02 datos de elegibilidad', () => {
  it('rechaza maxima menor que minima y permite edades de menores', () => {
    const schema = subProductoFormSchema('Cuenta')
    const sub = { codigoSubProducto: 'AHO-MN', nombreSubProducto: 'Ahorro menores' }
    expect(schema.safeParse({ ...sub, edadMinima: 18, edadMaxima: 17 }).success).toBe(false)
    expect(schema.parse({ ...sub, edadMinima: 0, edadMaxima: 17, tipoClientePermitido: 'Natural', requiereTutor: true, maximoPorCliente: 1 })).toMatchObject({ edadMinima: 0, edadMaxima: 17, requiereTutor: true, maximoPorCliente: 1 })
    expect(schema.safeParse({ ...sub, maximoPorCliente: 0 }).success).toBe(false)
  })
  it('envia el identificador del catalogo de tipos entregado por el backend', () => {
    const datos = productoFormSchema.parse({ ...cuenta, idTipoProducto: '3' })
    expect(payloadCrear(datos).idTipoProducto).toBe(3)
  })
})


it('agrupa por tipos del catalogo, incluidos certificados de aportacion', () => {
  const producto = { idTipoProducto: 3, tipoProducto: 'Cuenta' } as ProductoAdmin
  const grupos = agruparPorTipo([producto], [{ idTipoProducto: 3, codigo: 'CERTIFICADO_APORTACION', nombre: 'Certificados de aportación' }])
  expect(grupos).toEqual([{ tipo: 'CERTIFICADO_APORTACION', nombre: 'Certificados de aportación', productos: [producto] }])
})
