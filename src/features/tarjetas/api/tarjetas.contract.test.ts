import { describe, expect, it } from 'vitest'

import {
  pageHistorialSchema,
  pageSchema,
  tarjetaHistorialSchema,
  tarjetaResumenSchema,
  tarjetaSchema,
} from '@/features/tarjetas/api/tarjetas.contract'

const resumen = {
  idTarjeta: 7,
  idCliente: 3,
  idCuenta: 12,
  idProducto: 5,
  tipoTarjeta: 'Debito',
  nombreTarjeta: 'ANA PEREZ',
  numeroEnmascarado: '5412 **** **** 0007',
  estadoActual: 'Solicitada',
  fechaEmision: '2026-11-08',
  esExtension: false,
  idTarjetaTitular: null,
}

const detalle = {
  ...resumen,
  tokenTarjeta: 'tok_secreto_no_debe_salir',
  pinAsignado: false,
  fechaSolicitud: '2026-11-08',
  fechaResolucion: null,
  fechaExpiracion: '2031-11-30',
}

describe('tarjetaResumenSchema', () => {
  it('lee un ítem de TAR-02 de una tarjeta Solicitada', () => {
    const result = tarjetaResumenSchema.safeParse(resumen)
    expect(result.success).toBe(true)
  })

  it('lee una extensión con su tarjeta titular', () => {
    const result = tarjetaResumenSchema.parse({ ...resumen, esExtension: true, idTarjetaTitular: 4 })
    expect(result.esExtension).toBe(true)
    expect(result.idTarjetaTitular).toBe(4)
  })

  it('conserva un estado que el front no conoce', () => {
    expect(tarjetaResumenSchema.parse({ ...resumen, estadoActual: 'Suspendida' }).estadoActual).toBe('Suspendida')
  })

  it('rechaza una respuesta sin número enmascarado', () => {
    expect(tarjetaResumenSchema.safeParse({ ...resumen, numeroEnmascarado: undefined }).success).toBe(false)
  })
})

describe('tarjetaSchema', () => {
  it('descarta tokenTarjeta: nunca llega al front', () => {
    const result = tarjetaSchema.parse(detalle)
    expect(result).not.toHaveProperty('tokenTarjeta')
    expect(JSON.stringify(result)).not.toContain('tok_secreto_no_debe_salir')
  })

  it('lee fechas de resolución con hora y valores vacíos de una tarjeta aprobada', () => {
    const result = tarjetaSchema.parse({
      ...detalle,
      estadoActual: 'Aprobada',
      pinAsignado: true,
      fechaResolucion: '2026-11-09T14:30:00',
    })
    expect(result.fechaResolucion).toBe('2026-11-09T14:30:00')
    expect(result.pinAsignado).toBe(true)
  })
})

describe('pageSchema de tarjetas', () => {
  it('descarta el token también dentro de una página', () => {
    const page = pageSchema(tarjetaResumenSchema).parse({
      items: [{ ...resumen, tokenTarjeta: 'tok_x' }],
      page: 1,
      pageSize: 20,
      total: 1,
    })
    expect(page.items[0]).not.toHaveProperty('tokenTarjeta')
    expect(page.total).toBe(1)
  })
})

describe('tarjetaHistorialSchema (TAR-06)', () => {
  const cambioEstado = {
    idHistorial: 31,
    idTarjeta: 7,
    tipoEvento: 'Bloqueo',
    estadoAnterior: 'Activa',
    estadoNuevo: 'Bloqueada',
    motivo: 'Robo: reportado por el cliente',
    fechaCambio: '2026-11-17T10:15:00-05:00',
    realizadoPor: 42,
  }

  it('lee un cambio de estado sin los campos que el backend omite', () => {
    const evento = tarjetaHistorialSchema.parse(cambioEstado)
    expect(evento.estadoNuevo).toBe('Bloqueada')
    expect(evento.resultado).toBeUndefined()
    expect(evento.origen).toBeUndefined()
  })

  it('lee un CambioPin con resultado y origen, sin motivo', () => {
    const evento = tarjetaHistorialSchema.parse({
      idHistorial: 32,
      idTarjeta: 7,
      tipoEvento: 'CambioPin',
      resultado: 'COMPLETADO',
      origen: 'Regeneracion',
      fechaCambio: '2026-11-17T10:20:00-05:00',
      realizadoPor: 42,
    })
    expect(evento.origen).toBe('Regeneracion')
    expect(evento.motivo).toBeUndefined()
  })

  it('rechaza un origen de PIN desconocido', () => {
    expect(tarjetaHistorialSchema.safeParse({ ...cambioEstado, origen: 'Otro' }).success).toBe(false)
  })

  it('lee la página con su paginación', () => {
    const page = pageHistorialSchema.parse({ items: [cambioEstado], page: 1, pageSize: 20, total: 1 })
    expect(page.items).toHaveLength(1)
    expect(page.total).toBe(1)
  })
})
